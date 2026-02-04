import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChatPreview, useChat } from "@/context/chat-context";
import ChatActionMenu from "@/components/modals/ChatActionMenu";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";
import { useToast } from "@/components/ToastProvider";
import OnboardingBackground from "@/components/OnboardingBackground";
import { api } from "@/lib/api";
import icons from "@/constants/icons";

type SimpleUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  lastSeen?: string;
  isOnline?: boolean;
  updatedAt?: string;
};

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

const formatLastSeen = (value?: string) => {
  if (!value) {
    return "Active recently";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Active recently";
  }
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) {
    return `Active at ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return `Active ${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}`;
};

export default function Index() {
  const router = useRouter();
  const {
    conversations,
    loadingConversations,
    refreshConversations,
    unreadCounts,
    onlineUserIds,
    typingUsers,
    deleteConversation,
    togglePinConversation,
    toggleBlockConversation,
  } = useChat();
  const [refreshing, setRefreshing] = useState(false);
  const [menuChat, setMenuChat] = useState<ChatPreview | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
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
    return [...conversations].sort((a, b) => {
      const pinDelta = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinDelta !== 0) {
        return pinDelta;
      }
      return getChatSortTime(b) - getChatSortTime(a);
    });
  }, [conversations]);

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

  const handleOpenUser = (userItem: SimpleUser) => {
    if (!userItem?._id) {
      return;
    }
    router.push({ pathname: "/chat/[id]", params: { id: userItem._id } });
  };

  const openMenu = (chat: ChatPreview, event: any) => {
    const { pageY } = event.nativeEvent;
    setMenuChat(chat);
    setMenuPosition({ x: 0, y: pageY });
  };

  const conversationUsers = useMemo(() => {
    const seen = new Set<string>();
    const list: SimpleUser[] = [];
    conversations.forEach((chat) => {
      if (!chat.user?._id || seen.has(chat.user._id)) {
        return;
      }
      seen.add(chat.user._id);
      list.push({
        _id: chat.user._id,
        username: chat.user.username,
        profilePhoto: chat.user.profilePhoto,
        lastSeen: chat.user.lastSeen,
        isOnline: chat.user.isOnline,
        updatedAt: chat.user.updatedAt,
      });
    });
    return list;
  }, [conversations]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }
    if (allUsers.length > 0 || loadingUsers) {
      return;
    }
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await api.get<SimpleUser[]>("/user");
        if (Array.isArray(response)) {
          setAllUsers(response);
        }
      } catch {
        setAllUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [searchOpen, allUsers.length, loadingUsers]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return conversationUsers;
    }
    return allUsers.filter((userItem) =>
      userItem.username?.toLowerCase().includes(normalized),
    );
  }, [allUsers, conversationUsers, searchQuery]);

  const renderChatItem = (item: ChatPreview, isLast: boolean) => {
    const userId = item.user?._id;
    const isTyping = userId ? typingUsers[userId] : false;
    const lastMessageText = item.lastMessage?.message ?? "";
    const lastMessageLabel = item.lastMessage?.imageUrl
      ? lastMessageText
        ? `Photo: ${lastMessageText}`
        : "Photo"
      : lastMessageText;
    const message = item.isBlockedByOther
      ? "You are blocked by this user."
      : item.isBlocked
        ? "You blocked this chat."
        : isTyping
          ? "Typing..."
          : lastMessageLabel || "Say hello to your new friend.";
    const time = formatChatTime(item.lastMessage?.createdAt ?? item.updatedAt);
    const unreadCount = userId ? unreadCounts[userId] ?? 0 : 0;
    const isOnline = userId ? onlineUserIds.includes(userId) : false;

    return (
      <TouchableOpacity
        disabled={!item.user?._id}
        onPress={() => handleOpenChat(item)}
        onLongPress={(e) => openMenu(item, e)}
        className={`flex-row items-center px-4 py-3.5 ${isLast ? "" : "border-b border-white/20"}`}
      >
        <View className=" h-12 w-12 items-center relative justify-center rounded-full">
          {item.user?.profilePhoto ? (
            <Image source={{ uri: item.user.profilePhoto }} className="h-full w-full" />
          ) : (
            <Ionicons name="person" size={22} color="#cbd5f5" />
          )}
          {isOnline && (
            <View className="absolute top-0 left-0 h-2 w-2 rounded-full bg-pink-500 " />
          )}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex gap-2 flex-row items-center">
            <Text className="text-base text-black-800 font-rubik-semibold">
              {item.user?.username ?? "Unknown"}
            </Text>

          </View>

          <Text
            className={`mt-0.5 text-xs font-rubik ${isTyping ? "text-green-500" : "text-black-600"
              }`}
            numberOfLines={1}
          >
            {message}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-black-600 font-rubik">{time}</Text>
          {item.isPinned && (
            <Ionicons name="pin" size={12} color="#470E3C" style={{ marginTop: 4 }} />
          )}
          {unreadCount > 0 && (
            <View className="mt-1 min-w-[20px] items-center justify-center px-1.5 py-0.5">
              <Text className="text-[10px] font-rubik-bold text-pink-500">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItem = (item: SimpleUser, isLast: boolean) => {
    const isOnline = onlineUserIds.includes(item._id) || item.isOnline;
    const statusText = isOnline ? "Active now" : formatLastSeen(item.lastSeen ?? item.updatedAt);

    return (
      <TouchableOpacity
        onPress={() => handleOpenUser(item)}
        className={`flex-row items-center px-4 py-3.5 ${isLast ? "" : "border-b border-white/10"}`}
      >
        <View className="h-12 w-12 relative items-center justify-center">
          {item.profilePhoto ? (
            <Image source={{ uri: item.profilePhoto }} className="h-full w-full" />
          ) : (
            <Ionicons name="person" size={22} color="#cbd5f5" />
          )}
          {isOnline && (
            <View className=" absolute top-0 left-0 h-2 w-2 rounded-full bg-pink-500" />
          )}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base text-black-800 font-rubik-semibold">
              {item.username ?? "Unknown"}
            </Text>

          </View>
          <Text className="mt-0.5 text-xs font-rubik text-black-600">{statusText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6B6B6B" />
      </TouchableOpacity>
    );
  };

  return (
    <OnboardingBackground>
      <SafeAreaView className="flex-1 ">
        <View className="px-6 pt-2 pb-3 border-b border-black-300">
          {searchOpen ? (
            <View className="flex-row items-center gap-3">
              <View className="flex-1 flex-row items-center rounded-full border border-white/60 bg-white/70 px-4">
                <Ionicons name="search" size={18} color="#64748b" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search friends"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  selectionColor="#EB7CCF"
                  className="ml-3 flex-1 text-sm text-slate-800 font-rubik"
                />
              </View>
              <Pressable
                onPress={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <Text className="text-sm font-rubik-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setSearchOpen(true)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="search" size={18} color="#0f172a" />
              </Pressable>
              <Text className="text-lg font-rubik-semibold text-black-800">Chat</Text>
              <Pressable
                onPress={() => router.push("/notifications")}
                className="h-10 w-10 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="notifications" size={18} color="#0f172a" />
              </Pressable>
            </View>
          )}

          {searchOpen ? (
            <Text className="mt-4 text-xs font-rubik-semibold uppercase text-black-700">
              Find Friends
            </Text>
          ) : null}
        </View>

        <View className=" flex-1">
          <View className="flex-1 overflow-hidden">
            {searchOpen ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 6, paddingBottom: 80 }}
                ListEmptyComponent={
                  loadingUsers ? (
                    <View className="py-10 items-center">
                      <ActivityIndicator color="#e2e8f0" />
                      <Text className="mt-2 text-xs font-rubik text-slate-200">
                        Loading users...
                      </Text>
                    </View>
                  ) : (
                    <View className="py-10 items-center">
                      <Text className="text-sm text-slate-200 font-rubik">
                        No users found.
                      </Text>
                    </View>
                  )
                }
                renderItem={({ item, index }) =>
                  renderUserItem(item, index === searchResults.length - 1)
                }
              />
            ) : (
              <FlatList
                data={filteredChats}
                keyExtractor={(item) => item._id}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 6, paddingBottom: 80, }}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                renderItem={({ item, index }) =>
                  renderChatItem(item, index === filteredChats.length - 1)
                }
                ListEmptyComponent={
                  loadingConversations ? (
                    <View className="flex gap-3 py-10 items-center px-8">
                      <Text className="text-4xl font-rubik-bold text-center">Loading...</Text>
                    </View>
                  ) : (
                    <View className="py-10 items-center">
                      <Image 
                      source={icons.appIcon}
                      style={{width:200, height:200}}
                      />
                      <Text className="text-base text-slate-500 font-rubik">
                        Find people to chat with in search.
                      </Text>
                      <Pressable
                        className="mt-4 px-4 py-3 bg-white rounded-lg"
                        onPress={() => setSearchOpen(true)}
                      >
                        <Text className="text-lg font-rubik-semibold">
                          Get started
                        </Text>
                      </Pressable>
                    </View>
                  )
                }
              />
            )}
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
      <ConfirmActionModal
        visible={deleteChatOpen}
        title="Delete chat?"
        description="This will remove the chat from your list. Messages cannot be recovered."
        confirmText="Delete"
        onClose={() => setDeleteChatOpen(false)}
        onConfirm={async () => {
          if (!menuChat) {
            return;
          }
          await deleteConversation(menuChat._id, menuChat.user?._id ?? null);
          showToast("Chat deleted", "success");
          setMenuChat(null);
        }}
      />
    </OnboardingBackground>
  );
}
