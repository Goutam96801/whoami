import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api, API_SOCKET_URL } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

type ChatUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  isOnline?: boolean;
  lastSeen?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
};

export type ChatPreview = {
  _id: string;
  user: ChatUser | null;
  lastMessage: ChatMessage | null;
  updatedAt: string;
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

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [activeChatUserId, setActiveChatUserIdState] = useState<string | null>(null);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    const response = await api.get<ChatPreview[]>("/message/conversations");
    if (Array.isArray(response)) {
      setConversations(response);
    }
  }, [user?.id]);

  const markConversationRead = useCallback((userId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[userId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[userId];
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
    if (!socket || !user?.id) {
      return;
    }

    const handleOnlineUsers = (users = []) => {
      if (Array.isArray(users)) {
        setOnlineUserIds(users);
      }
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
      }

      if (!hasConversation) {
        refreshConversations().catch(() => null);
      }
    };

    socket.on("newMessage", handleIncoming);
    socket.on("getOnlineUsers", handleOnlineUsers);

    return () => {
      socket.off("newMessage", handleIncoming);
      socket.off("getOnlineUsers", handleOnlineUsers);
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
