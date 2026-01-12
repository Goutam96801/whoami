import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { ChatMessage, ChatPreview, useChat } from "@/context/chat-context";
import { useFocusEffect } from "@react-navigation/native";
import ChatActionMenu from "@/components/modals/ChatActionMenu";
import { useToast } from "@/components/ToastProvider";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";

const formatMessageTime = (value?: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function ChatScreen() {
  const { user } = useAuth();
  const {
    conversations,
    latestMessage,
    markConversationRead,
    onlineUserIds,
    setActiveChatUserId,
    updateConversationFromMessage,
    toggleBlockConversation,
    deleteConversation,
    togglePinConversation,
  } = useChat();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, username, profilePhoto, lastSeen } = useLocalSearchParams();
  const receiverId = Array.isArray(id) ? id[0] : id;
  const receiverName = Array.isArray(username) ? username[0] : username;
  const receiverPhoto = Array.isArray(profilePhoto) ? profilePhoto[0] : profilePhoto;
  const receiverLastSeen = Array.isArray(lastSeen) ? lastSeen[0] : lastSeen;
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [menuChat, setMenuChat] = useState<ChatPreview | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const { showToast } = useToast();

  const conversation = useMemo(() => {
    if (!receiverId) {
      return null;
    }
    return conversations.find((conv) => conv.user?._id === receiverId) ?? null;
  }, [conversations, receiverId]);

  const chatUser = conversation?.user ?? null;
  const conversationId = conversation?._id ?? null;
  const isBlocked = conversation?.isBlocked ?? false;
  const isBlockedByOther = conversation?.isBlockedByOther ?? false;

  const isOnline = receiverId
    ? onlineUserIds.includes(receiverId) || chatUser?.isOnline
    : false;

  const formatLastSeen = (value?: string | null) => {
    if (!value) {
      return "Last seen recently";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Last seen recently";
    }
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();
    if (isSameDay) {
      return `Last seen at ${date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
    return `Last seen ${date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })} at ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  };

  const lastSeenValue = chatUser?.lastSeen ?? receiverLastSeen ?? chatUser?.updatedAt;
  const statusText = isOnline ? "Active now" : formatLastSeen(lastSeenValue);
  const displayName = receiverName ?? chatUser?.username ?? "Chat";
  const displayPhoto = receiverPhoto ?? chatUser?.profilePhoto;

  const fetchMessages = async () => {
    if (!receiverId) {
      return;
    }
    const response = await api.get<ChatMessage[] | null>(`/message/${receiverId}`);
    if (Array.isArray(response)) {
      setMessages(response);
    } else {
      setMessages([]);
    }
  };

  useEffect(() => {
    const loadMessages = async () => {
      try {
        await fetchMessages();
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [receiverId]);

  useFocusEffect(
    useCallback(() => {
      if (receiverId) {
        setActiveChatUserId(receiverId);
        markConversationRead(receiverId);
      }
      return () => {
        setActiveChatUserId(null);
      };
    }, [markConversationRead, receiverId, setActiveChatUserId]),
  );

  useEffect(() => {
    if (!latestMessage || !receiverId || !user?.id) {
      return;
    }
    const isForThisChat =
      latestMessage.senderId === receiverId &&
      latestMessage.receiverId === user.id;
    if (!isForThisChat) {
      return;
    }

    setMessages((prev) => {
      if (prev.some((message) => message._id === latestMessage._id)) {
        return prev;
      }
      return [...prev, latestMessage];
    });
  }, [latestMessage, receiverId, user?.id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !receiverId || isBlocked || isBlockedByOther) {
      return;
    }
    setSending(true);
    try {
      const response = await api.post<{ newMessage: ChatMessage }>(
        `/message/send/${receiverId}`,
        { message: trimmed },
      );
      if (response?.newMessage) {
        setMessages((prev) => {
          if (prev.some((message) => message._id === response.newMessage._id)) {
            return prev;
          }
          return [...prev, response.newMessage];
        });
        updateConversationFromMessage(response.newMessage, {
          _id: receiverId,
          username: displayName,
          profilePhoto: displayPhoto,
        });
        setText("");
      }
    } catch {
      // Ignore send errors; keep draft for retry.
    } finally {
      setSending(false);
    }
  };

  const isSendDisabled = !text.trim() || sending || isBlocked || isBlockedByOther;

  const handleUnblock = async () => {
    if (!conversationId) {
      return;
    }
    try {
      await toggleBlockConversation(conversationId, false);
    } catch {
      // Ignore unblock errors.
    }
  };

  const confirmDeleteChat = (chat: ChatPreview) => {
    Alert.alert(
      "Delete chat?",
      "This removes the chat from your list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteConversation(chat._id, chat.user?._id ?? null).catch(() => null),
        },
      ],
      { cancelable: true },
    );
  };

  const openMenu = (chat: ChatPreview, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuChat(chat);
    setMenuPosition({ x: pageX, y: pageY });
  };

  return (
    <View className="flex-1 bg-[#15171c]">
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "rgba(0,0,0,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220 }}
      />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
          style={{ flex: 1 }}
        >
          <View className="border-b border-white/10 bg-[#15171c]/95 px-6 pb-3 pt-2">
            <View className="flex-row items-center gap-3 ">
              <TouchableOpacity
                onPress={() => router.back()}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <Ionicons name="chevron-back" size={20} color="#e2e8f0" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                  {displayPhoto ? (
                    <Image source={{ uri: displayPhoto }} className="h-full w-full" />
                  ) : (
                    <Ionicons name="person" size={22} color="#cbd5f5" />
                  )}
                </View>
                <View>
                  <Text className="text-base font-rubik-semibold text-white">
                    {displayName}
                  </Text>
                  <Text className="text-xs font-rubik text-slate-400">
                    {statusText}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  if (conversation) {
                    openMenu(conversation, e);
                  }
                }}
                hitSlop={10}
                className="ml-auto h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#e2e8f0" />
              </TouchableOpacity>

            </View>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 24,
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.id;
              return (
                <View className={`mb-4 ${isMe ? "items-end" : "items-start"}`}>
                  <View
                    className={`max-w-[78%] rounded-2xl px-4 py-3 ${isMe ? "bg-amber-400" : "bg-white/10"
                      }`}
                  >
                    <Text
                      className={`text-sm font-rubik ${isMe ? "text-slate-900" : "text-white"
                        }`}
                    >
                      {item.message}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[10px] font-rubik text-slate-400">
                    {formatMessageTime(item.createdAt)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              loading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator color="#e2e8f0" />
                </View>
              ) : (
                <View className="py-10 items-center">
                  <Text className="text-sm font-rubik text-slate-400">
                    No messages yet. Say hello to start the chat.
                  </Text>
                </View>
              )
            }
          />

          <View className="border-t border-white/10 bg-[#15171c]/95 px-6 py-4">
            {isBlocked || isBlockedByOther ? (
              <View className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Text className="text-sm font-rubik text-slate-300">
                  {isBlockedByOther
                    ? "You cannot reply to this chat."
                    : "You blocked this chat."}
                </Text>
                {isBlocked && (
                  <TouchableOpacity
                    onPress={handleUnblock}
                    className="mt-3 items-center rounded-xl bg-amber-400 px-3 py-2"
                  >
                    <Text className="text-xs font-rubik-semibold text-slate-900">
                      Unblock to message
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Type a message"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm font-rubik text-white max-h-[100px]"
                  multiline
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    if (!isSendDisabled) {
                      handleSend();
                    }
                  }}
                />

                <TouchableOpacity
                  onPress={handleSend}
                  disabled={isSendDisabled}
                  className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${isSendDisabled ? "bg-white/5" : "bg-amber-400"
                    }`}
                >
                  {sending ? (
                    <ActivityIndicator
                      color={isSendDisabled ? "#94a3b8" : "#0f172a"}
                    />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color={isSendDisabled ? "#94a3b8" : "#0f172a"}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ChatActionMenu
        visible={!!menuChat}
        chat={menuChat}
        position={menuPosition}
        onClose={() => {
          setMenuChat(null);
          setMenuPosition(null);
        }}
        onPin={() => {
          togglePinConversation(menuChat!._id, !menuChat!.isPinned).catch(() => null);
          setMenuChat(null);
        }}
        onBlock={() => {
          toggleBlockConversation(menuChat!._id, !menuChat!.isBlocked).catch(() => null);
          setMenuChat(null);
        }}
        onDelete={() => {
          setDeleteChatOpen(true);
        }}
      />
      <ConfirmActionModal
        visible={deleteChatOpen}
        title="Delete chat?"
        description="This will remove the chat from your list. Messages cannot be recovered."
        confirmText="Delete"
        onClose={() => setDeleteChatOpen(false)}
        onConfirm={async () => {
          await deleteConversation(menuChat!._id, menuChat!.user?._id ?? null);
          showToast("Chat deleted", "success");
          setMenuChat(null);
          router.push('/')
        }}
      />
    </View>
  );
}
