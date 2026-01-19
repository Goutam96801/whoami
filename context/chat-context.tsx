import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import { api, API_SOCKET_URL } from "@/lib/api";
import { sendLocalNotification } from "@/lib/notifications";
import { useAuth } from "@/context/auth-context";

type ChatUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  isOnline?: boolean;
  lastSeen?: string;
  updatedAt?: string;
  dateOfBirth?: string;
  interests?: string[];
  gender?: string;
};

export type ChatMessage = {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  imageUrl?: string;
  streakCount?: number;
  replyTo?:
    | string
    | {
        _id: string;
        message?: string;
        imageUrl?: string;
        senderId?: string;
        createdAt?: string;
      };
  createdAt: string;
};

export type ChatPreview = {
  _id: string;
  user: ChatUser | null;
  lastMessage: ChatMessage | null;
  updatedAt: string;
  unreadCount?: number;
  streakCount?: number;
  isPinned?: boolean;
  isBlocked?: boolean;
  isBlockedByOther?: boolean;
};

type ChatContextValue = {
  conversations: ChatPreview[];
  loadingConversations: boolean;
  refreshConversations: () => Promise<void>;
  unreadCounts: Record<string, number>;
  onlineUserIds: string[];
  typingUsers: Record<string, boolean>;
  sendTyping: (userId: string, isTyping: boolean) => void;
  deleteConversation: (conversationId: string, userId: string | null) => Promise<void>;
  togglePinConversation: (conversationId: string, shouldPin: boolean) => Promise<void>;
  toggleBlockConversation: (conversationId: string, shouldBlock: boolean) => Promise<void>;
  activeChatUserId: string | null;
  setActiveChatUserId: (userId: string | null) => void;
  markConversationRead: (userId: string) => void;
  latestMessage: ChatMessage | null;
  updateConversationFromMessage: (message: ChatMessage, otherUser?: ChatUser | null) => void;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);
const UNREAD_KEY_PREFIX = "whoami.unreadCounts.";

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [activeChatUserId, setActiveChatUserIdState] = useState<string | null>(null);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const prevUnreadRef = useRef<Record<string, number>>({});

  const refreshConversations = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    const response = await api.get<ChatPreview[]>("/message/conversations");
    if (Array.isArray(response)) {
      setConversations(response);
      const nextUnread: Record<string, number> = {};
      response.forEach((conv) => {
        const userId = conv.user?._id;
        if (userId) {
          nextUnread[userId] = conv.unreadCount ?? 0;
        }
      });
      setUnreadCounts(nextUnread);

      Object.entries(nextUnread).forEach(([otherUserId, count]) => {
        if (!count) {
          return;
        }
        if (activeChatUserId && activeChatUserId === otherUserId) {
          return;
        }
        const prevCount = prevUnreadRef.current[otherUserId] ?? 0;
        if (count > prevCount) {
          const chatUser = response.find((conv) => conv.user?._id === otherUserId)?.user;
          const title = chatUser?.username ?? "New message";
          sendLocalNotification("message", {
            title,
            body: `You have ${count} unread message${count > 1 ? "s" : ""}.`,
            data: { userId: otherUserId },
          }).catch(() => null);
        }
      });

      prevUnreadRef.current = nextUnread;
    }
  }, [activeChatUserId, user?.id]);

  const markConversationRead = useCallback((userId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[userId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[userId];
      prevUnreadRef.current = { ...prevUnreadRef.current, [userId]: 0 };
      return next;
    });
  }, []);

  const setActiveChatUserId = useCallback(
    (userId: string | null) => {
      setActiveChatUserIdState(userId);
      if (userId) {
        markConversationRead(userId);
      }
    },
    [markConversationRead],
  );

  const updateConversationFromMessage = useCallback(
    (message: ChatMessage, otherUser?: ChatUser | null) => {
      if (!user?.id) {
        return;
      }
      const otherUserId =
        message.senderId === user.id ? message.receiverId : message.senderId;

      setConversations((prev) => {
        const index = prev.findIndex((conv) => conv.user?._id === otherUserId);
        const existing = index >= 0 ? prev[index] : null;
        const updated = {
          ...(existing ?? {}),
          _id: existing?._id ?? `temp-${message._id}`,
          user: existing?.user ?? otherUser ?? null,
          lastMessage: message,
          updatedAt: message.createdAt,
          streakCount:
            typeof message.streakCount === "number"
              ? message.streakCount
              : existing?.streakCount,
          isPinned: existing?.isPinned,
          isBlocked: existing?.isBlocked,
          isBlockedByOther: existing?.isBlockedByOther,
        } as ChatPreview;

        if (index === -1) {
          if (!otherUser) {
            return prev;
          }
          return [updated, ...prev];
        }

        return [updated, ...prev.filter((_, idx) => idx !== index)];
      });
    },
    [user?.id],
  );

  const deleteConversation = useCallback(
    async (conversationId: string, otherUserId: string | null) => {
      await api.del(`/message/conversations/${conversationId}`);
      setConversations((prev) => prev.filter((conv) => conv._id !== conversationId));
      if (otherUserId) {
        setUnreadCounts((prev) => {
          if (!prev[otherUserId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[otherUserId];
          return next;
        });
      }
    },
    [],
  );

  const togglePinConversation = useCallback(async (conversationId: string, shouldPin: boolean) => {
    if (shouldPin) {
      await api.post(`/message/conversations/${conversationId}/pin`, {});
    } else {
      await api.del(`/message/conversations/${conversationId}/pin`);
    }
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId ? { ...conv, isPinned: shouldPin } : conv,
      ),
    );
  }, []);

  const toggleBlockConversation = useCallback(async (conversationId: string, shouldBlock: boolean) => {
    if (shouldBlock) {
      await api.post(`/message/conversations/${conversationId}/block`, {});
    } else {
      await api.del(`/message/conversations/${conversationId}/block`);
    }
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId
          ? { ...conv, isBlocked: shouldBlock, isBlockedByOther: false }
          : conv,
      ),
    );
  }, []);

  const sendTyping = useCallback(
    (receiverId: string, isTyping: boolean) => {
      if (!socket || !receiverId) {
        return;
      }
      socket.emit("typing", { to: receiverId, isTyping });
    },
    [socket],
  );

  useEffect(() => {
    let active = true;
    const loadConversations = async () => {
      if (!user?.id) {
        setConversations([]);
        setUnreadCounts({});
        setOnlineUserIds([]);
        setLoadingConversations(false);
        return;
      }

      setLoadingConversations(true);
      try {
        await refreshConversations();
      } catch {
        if (active) {
          setConversations([]);
        }
      } finally {
        if (active) {
          setLoadingConversations(false);
        }
      }
    };

    loadConversations();

    return () => {
      active = false;
    };
  }, [refreshConversations, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      socket?.disconnect();
      setSocket(null);
      setOnlineUserIds([]);
      setTypingUsers({});
      setUnreadCounts({});
      return;
    }

    const nextSocket = io(API_SOCKET_URL, {
      transports: ["websocket"],
      query: { userId: user.id },
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    const loadUnreadCounts = async () => {
      if (!user?.id) {
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(`${UNREAD_KEY_PREFIX}${user.id}`);
        if (!raw) {
          setUnreadCounts({});
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, number>;
        if (parsed && typeof parsed === "object") {
          setUnreadCounts(parsed);
        } else {
          setUnreadCounts({});
        }
      } catch {
        setUnreadCounts({});
      }
    };

    loadUnreadCounts();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    AsyncStorage.setItem(
      `${UNREAD_KEY_PREFIX}${user.id}`,
      JSON.stringify(unreadCounts),
    ).catch(() => null);
  }, [unreadCounts, user?.id]);

  useEffect(() => {
    if (!socket || !user?.id) {
      return;
    }

    const handleOnlineUsers = (users = []) => {
      if (Array.isArray(users)) {
        setOnlineUserIds(users);
      }
    };

    const handleTyping = (payload: { from?: string; isTyping?: boolean }) => {
      const from = payload?.from;
      if (!from) {
        return;
      }
      setTypingUsers((prev) => ({
        ...prev,
        [from]: Boolean(payload?.isTyping),
      }));
    };

    const handleIncoming = (message: ChatMessage) => {
      const otherUserId =
        message.senderId === user.id ? message.receiverId : message.senderId;
      const hasConversation = conversations.some(
        (conv) => conv.user?._id === otherUserId,
      );

      setLatestMessage(message);
      updateConversationFromMessage(message);

      if (!activeChatUserId || activeChatUserId !== otherUserId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] ?? 0) + 1,
        }));

        const sender = conversations.find((conv) => conv.user?._id === otherUserId)?.user;
        const title = sender?.username ?? "New message";
        const body = message.message?.slice(0, 120) ?? "You received a new message.";
        sendLocalNotification("message", {
          title,
          body,
          data: { userId: otherUserId },
        }).catch(() => null);
      }

      if (!hasConversation) {
        refreshConversations().catch(() => null);
      }

      setTypingUsers((prev) => {
        if (!prev[otherUserId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[otherUserId];
        return next;
      });
    };

    socket.on("newMessage", handleIncoming);
    socket.on("getOnlineUsers", handleOnlineUsers);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("newMessage", handleIncoming);
      socket.off("getOnlineUsers", handleOnlineUsers);
      socket.off("typing", handleTyping);
    };
  }, [
    activeChatUserId,
    conversations,
    refreshConversations,
    socket,
    updateConversationFromMessage,
    user?.id,
  ]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        loadingConversations,
        refreshConversations,
        unreadCounts,
        onlineUserIds,
        typingUsers,
        sendTyping,
        deleteConversation,
        togglePinConversation,
        toggleBlockConversation,
        activeChatUserId,
        setActiveChatUserId,
        markConversationRead,
        latestMessage,
        updateConversationFromMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};
