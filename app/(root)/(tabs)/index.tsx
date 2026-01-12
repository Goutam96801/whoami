import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/auth-context";
import { ChatPreview, useChat } from "@/context/chat-context";
import ChatActionMenu from "@/components/modals/ChatActionMenu";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";
import { useToast } from "@/components/ToastProvider";
import { getChatGreeting } from "@/constants/ChatGreetings";

const formatChatTime = (value?: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    conversations,
    loadingConversations,
    refreshConversations,
    unreadCounts,
    onlineUserIds,
    deleteConversation,
    togglePinConversation,
    toggleBlockConversation,
  } = useChat();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuChat, setMenuChat] = useState<ChatPreview | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const { showToast } = useToast();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshConversations();
    } catch {
      // Keep existing chats on refresh failure.
    } finally {
      setRefreshing(false);
    }
  };

  const getChatSortTime = (chat: ChatPreview) => {
    const value = chat.lastMessage?.createdAt ?? chat.updatedAt;
    if (!value) {
      return 0;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const filteredChats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = normalized
      ? conversations.filter((chat) => {
        const name = chat.user?.username?.toLowerCase() ?? "";
        const message = chat.lastMessage?.message?.toLowerCase() ?? "";
        return name.includes(normalized) || message.includes(normalized);
      })
      : conversations;

    return [...base].sort((a, b) => {
      const pinDelta = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinDelta !== 0) {
        return pinDelta;
      }
      return getChatSortTime(b) - getChatSortTime(a);
    });
  }, [conversations, query]);

  const handleOpenChat = (chat: ChatPreview) => {
    if (!chat.user?._id) {
      return;
    }
    const params: Record<string, string> = {
      id: chat.user._id,
      username: chat.user.username,
    };
    if (chat.user.profilePhoto) {
      params.profilePhoto = chat.user.profilePhoto;
    }
    if (chat.user.lastSeen) {
      params.lastSeen = chat.user.lastSeen;
    }
    router.push({ pathname: "/chat/[id]", params });
  };

  const openMenu = (chat: ChatPreview, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuChat(chat);
    setMenuPosition({ x: 0, y: pageY });
  };



  return (
    <LinearGradient
      colors={["#5b3a5a", "#0f2633"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <View className="px-6 pt-2">
          <Text className="text-center text-lg font-rubik-semibold text-white">
            Chats
          </Text>
          <View className="mt-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-slate-200 font-rubik">
                {getChatGreeting(user?.username)}
              </Text>

              <Text className="mt-1 text-2xl text-white font-rubik-bold">
                {user?.username ?? "Guest"}
              </Text>
            </View>
            <TouchableOpacity className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
              {user?.profilePhoto ? (
                <Image
                  source={{ uri: user.profilePhoto }}
                  className="h-full w-full"
                />
              ) : (
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  color="#e2e8f0"
                />
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-4 flex-row items-center rounded-full border border-white/10 bg-white/10 px-4 ">
            <Ionicons name="search" size={18} color="#cbd5f5" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search in chat"
              placeholderTextColor="#cbd5f5"
              className="ml-3 flex-1 text-sm text-white font-rubik"
            />
          </View>
        </View>

        <View className="mt-5 flex-1 px-6 ">
          <View className="flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
            <FlatList
              data={filteredChats}
              keyExtractor={(item) => item._id}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6, paddingBottom: 80 }}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              renderItem={({ item, index }) => {
                const isLast = index === filteredChats.length - 1;
                const message = item.isBlockedByOther
                  ? "You are blocked by this user."
                  : item.isBlocked
                    ? "You blocked this chat."
                    : item.lastMessage?.message ?? "Start the conversation.";
                const time = formatChatTime(
                  item.lastMessage?.createdAt ?? item.updatedAt,
                );
                const userId = item.user?._id;
                const unreadCount = userId ? unreadCounts[userId] ?? 0 : 0;
                const isOnline = userId ? onlineUserIds.includes(userId) : false;

                return (
                  <TouchableOpacity
                    disabled={!item.user?._id}
                    onPress={() => handleOpenChat(item)}
                    onLongPress={(e) => openMenu(item, e)}
                    className={`flex-row items-center px-4 py-3.5 ${isLast ? "" : "border-b border-white/10"}`}
                  >
                    <View className="h-12 w-12 items-center relative justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                      {item.user?.profilePhoto ? (
                        <Image
                          source={{ uri: item.user.profilePhoto }}
                          className="h-full w-full"
                        />
                      ) : (
                        <Ionicons name="person" size={22} color="#cbd5f5" />
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex gap-2 flex-row items-center">
                        <Text className="text-base text-white font-rubik-semibold">
                          {item.user?.username ?? "Unknown"}
                        </Text>
                        {isOnline && (
                          <View className=" h-3 w-3 rounded-full border border-[#0f2633] bg-green-400 " />
                        )}
                      </View>

                      <Text
                        className="mt-0.5 text-xs text-slate-200 font-rubik"
                        numberOfLines={1}
                      >
                        {message}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-slate-300 font-rubik">
                        {time}
                      </Text>
                      {item.isPinned && (
                        <Ionicons
                          name="pin"
                          size={12}
                          color="#fbbf24"
                          style={{ marginTop: 4 }}
                        />
                      )}
                      {unreadCount > 0 && (
                        <View className="mt-1 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5">
                          <Text className="text-[10px] font-rubik-bold text-slate-900">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ConfirmActionModal
                      visible={deleteChatOpen}
                      title="Delete chat?"
                      description="This will remove the chat from your list. Messages cannot be recovered."
                      confirmText="Delete"
                      onClose={() => setDeleteChatOpen(false)}
                      onConfirm={async () => {
                        await deleteConversation(item._id, item.user?._id ?? null);
                        showToast("Chat deleted", "success");
                        setMenuChat(null);
                      }}
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                loadingConversations ? (
                  <View className="py-10 items-center">
                    <ActivityIndicator color="#e2e8f0" />
                  </View>
                ) : (
                  <View className="py-10 items-center">
                    <Text className="text-sm text-slate-200 font-rubik">
                      {query.trim()
                        ? "No chats match your search."
                        : "No chats yet. Start one from Explore."}
                    </Text>
                  </View>
                )
              }
            />

          </View>
        </View>
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
    </LinearGradient>
  );
}
