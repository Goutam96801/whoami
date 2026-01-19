import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { ChatMessage, ChatPreview, useChat } from "@/context/chat-context";
import { useFocusEffect } from "@react-navigation/native";
import ChatActionMenu from "@/components/modals/ChatActionMenu";
import { useToast } from "@/components/ToastProvider";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";
import OnboardingBackground from "@/components/OnboardingBackground";
import { ProfileCard } from "@/components/profile/profileCard";
import { getStreakEmoji } from "@/constants/constant";

type RemoteUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  isOnline?: boolean;
  lastSeen?: string;
  interests?: string[];
  gender?: string;
  updatedAt?: string;
};

type ChatListItem =
  | { type: "profile"; id: string }
  | { type: "message"; message: ChatMessage };

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

const getAgeFromDob = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const hasHadBirthday =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!hasHadBirthday) {
    age -= 1;
  }
  return age;
};

const isEmojiOnly = (value?: string) => {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s]+$/u.test(
    trimmed,
  );
};

const EMOJI_OPTIONS = [
  "\uD83D\uDE04",
  "\uD83D\uDE0A",
  "\uD83D\uDE02",
  "\uD83D\uDE2E",
  "\uD83D\uDE18",
  "\uD83D\uDC4D",
  "\uD83E\uDD73",
  "\uD83D\uDE0D",
  "\uD83D\uDE22",
  "\uD83D\uDE21",
  "\uD83D\uDC4C",
  "\uD83D\uDE09",
];

export default function ChatScreen() {
  const { user } = useAuth();
  const {
    conversations,
    latestMessage,
    markConversationRead,
    onlineUserIds,
    typingUsers,
    sendTyping,
    setActiveChatUserId,
    updateConversationFromMessage,
    toggleBlockConversation,
    deleteConversation,
    togglePinConversation,
  } = useChat();
  const router = useRouter();
  const { id, username, profilePhoto, lastSeen } = useLocalSearchParams();
  const receiverId = Array.isArray(id) ? id[0] : id;
  const receiverName = Array.isArray(username) ? username[0] : username;
  const receiverPhoto = Array.isArray(profilePhoto) ? profilePhoto[0] : profilePhoto;
  const receiverLastSeen = Array.isArray(lastSeen) ? lastSeen[0] : lastSeen;
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [receiverProfile, setReceiverProfile] = useState<RemoteUser | null>(null);
  const [menuChat, setMenuChat] = useState<ChatPreview | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const { showToast } = useToast();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStateRef = useRef(false);
  const imageSizeCache = useRef<
    Record<string, { width: number; height: number }>
  >({});

  const getScaledSize = (
    uri: string,
    maxWidth = 260,
    onReady: () => void,
  ) => {
    if (imageSizeCache.current[uri]) {
      return imageSizeCache.current[uri];
    }

    Image.getSize(
      uri,
      (width, height) => {
        imageSizeCache.current[uri] = { width, height };
        onReady();
      },
      () => { },
    );

    return { width: maxWidth, height: maxWidth };
  };


  const listData = useMemo<ChatListItem[]>(() => {
    return [
      { type: "profile", id: "profile-card" },
      ...messages.map((message) => ({ type: "message", message })),
    ];
  }, [messages]);

  const messageLookup = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach((msg) => {
      map.set(msg._id, msg);
    });
    return map;
  }, [messages]);

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

  const mergedProfile = receiverProfile
    ? {
      ...chatUser,
      ...receiverProfile,
      profilePhoto:
        receiverProfile.profilePhoto ??
        receiverProfile.profilePicture ??
        chatUser?.profilePhoto,
    }
    : chatUser;

  const isOnline = receiverId
    ? onlineUserIds.includes(receiverId) || mergedProfile?.isOnline
    : false;
  const isTyping = receiverId ? typingUsers[receiverId] : false;
  const streakCount = conversation?.streakCount ?? 0;
  const streakEmoji = getStreakEmoji(streakCount);

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

  const lastSeenValue =
    mergedProfile?.lastSeen ?? receiverLastSeen ?? mergedProfile?.updatedAt;
  const statusText = isOnline ? "Online" : formatLastSeen(lastSeenValue);
  const headerStatus = isTyping ? "Typing..." : statusText;
  const displayName = receiverName ?? mergedProfile?.username ?? "Chat";
  const displayPhoto = receiverPhoto ?? mergedProfile?.profilePhoto;
  const displayAge = getAgeFromDob(mergedProfile?.dateOfBirth);
  const displayInterests = mergedProfile?.interests ?? [];

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

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (receiverId) {
        sendTyping(receiverId, false);
      }
      typingStateRef.current = false;
    };
  }, [receiverId, sendTyping]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!receiverId) {
        setReceiverProfile(null);
        return;
      }
      try {
        const response = await api.get<{ user: RemoteUser }>(`/user/${receiverId}`);
        if (response?.user) {
          setReceiverProfile(response.user);
        }
      } catch {
        setReceiverProfile(null);
      }
    };

    loadProfile();
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

  const sendMessage = async (payload: { message?: string; image?: string }) => {
    if (!receiverId || isBlocked || isBlockedByOther) {
      return;
    }
    const trimmedMessage = payload.message?.trim() ?? "";
    if (!trimmedMessage && !payload.image) {
      return;
    }

    sendTyping(receiverId, false);
    typingStateRef.current = false;
    setSending(true);
    try {
      const response = await api.post<{ newMessage: ChatMessage }>(
        `/message/send/${receiverId}`,
        {
          message: trimmedMessage,
          image: payload.image,
          replyTo: replyTarget?._id ?? undefined,
        },
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
        setReplyTarget(null);
      }
    } catch {
      // Ignore send errors; keep draft for retry.
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    await sendMessage({ message: text });
  };

  const handlePickImage = async () => {
    if (sending || isBlocked || isBlockedByOther) {
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Allow photo access to send images.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      showToast("Unable to read selected image.", "error");
      return;
    }

    const mimeType = asset.mimeType ?? "image/jpeg";
    const dataUri = `data:${mimeType};base64,${asset.base64}`;
    await sendMessage({ message: text, image: dataUri });
  };

  const emitTyping = (next: boolean) => {
    if (!receiverId || isBlocked || isBlockedByOther) {
      return;
    }
    if (typingStateRef.current === next) {
      return;
    }
    typingStateRef.current = next;
    sendTyping(receiverId, next);
  };

  const scheduleStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
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
    <OnboardingBackground>
      <View className="flex-1">
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior="padding"
            className="flex-1 justify-center"
          >
            <View className="px-6 pb-3 pt-2">
              <View className="flex-row items-center justify-between gap-3 ">
                <Pressable
                  onPress={() => router.back()}
                  className="h-10 w-10 items-center justify-center rounded-lg bg-white"
                >
                  <Ionicons name="chevron-back" size={18} color="#5d5e5f" />
                </Pressable>
                <View className="flex-row items-center gap-3 bg-white px-2 py-1 rounded-lg">
                  <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                    {displayPhoto ? (
                      <Image source={{ uri: displayPhoto }} className="h-full w-full" />
                    ) : (
                      <Ionicons name="person" size={18} color="#cbd5f5" />
                    )}
                  </View>
                  <View>
                    <Text className="text-base font-rubik-semibold ">
                      {displayName}
                      {typeof displayAge === "number" ? `, ${displayAge}` : ""}
                    </Text>
                    <Text
                      className={`font-rubik  ${(isTyping || isOnline)
                        ? "text-xs text-pink-500"
                        : "text-[8px] text-slate-400"
                        }`}
                    >
                      {headerStatus}
                    </Text>
                  </View>
                  {
                    conversation &&
                    <Pressable
                      onPress={(e) => {
                        if (!conversation) return;
                        openMenu(conversation, e);
                      }}
                    >
                      <Ionicons name="chevron-down" size={18} color="#a5a5a5" />
                    </Pressable>
                  }

                </View>

                <View className="flex-row gap-2 bg-white px-2 py-1.5 rounded-lg items-center">
                  <Text className="font-rubik-medium">{streakCount}</Text>
                  <Text className="text-lg">{streakEmoji}</Text>
                </View>

              </View>
            </View>

            <FlatList
              ref={listRef}
              data={listData}
              keyExtractor={(item) =>
                item.type === "profile" ? item.id : item.message._id
              }
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 56,
                paddingBottom: 24,
              }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                if (item.type === "profile") {
                  return (
                    <View className="mb-6">
                      <ProfileCard
                        username={displayName}
                        profilePhoto={displayPhoto}
                        isOnline={isOnline}
                        statusText={headerStatus}
                        age={displayAge}
                        interests={displayInterests}
                        onProfilePress={() => {
                          if (!receiverId) {
                            return;
                          }
                          router.push({ pathname: "/user/[id]", params: { id: receiverId } });
                        }}
                        onReportPress={() => {
                          if (!receiverId) {
                            return;
                          }
                          router.push({ pathname: "/report/[id]", params: { id: receiverId } });
                        }}
                      />
                    </View>
                  );
                }

                const message = item.message;
                const isMe = message.senderId === user?.id;
                const replyData =
                  typeof message.replyTo === "string"
                    ? messageLookup.get(message.replyTo)
                    : message.replyTo;
                const replyText = replyData?.message ?? "";
                const replyLabel = replyData?.imageUrl
                  ? replyText
                    ? `Photo: ${replyText}`
                    : "Photo"
                  : replyText;
                const replyAuthor =
                  replyData?.senderId && replyData.senderId === user?.id
                    ? "You"
                    : displayName;
                const showReply = Boolean(replyLabel);
                const hasImage = Boolean(message.imageUrl);
                const showEmojiOnly =
                  !hasImage && !showReply && isEmojiOnly(message.message);
                const timeLabel = formatMessageTime(message.createdAt);

                return (
                  <View className={`mb-4 ${isMe ? "items-end" : "items-start"}`}>
                    <Pressable
                      onLongPress={() => setReplyTarget(message)}
                      className={showEmojiOnly ? "" : "max-w-[78%]"}
                    >
                      <View
                        className={`min-w-[80px] rounded-2xl ${showEmojiOnly
                          ? "bg-transparent"
                          :
                          isMe
                            ? `bg-white ${hasImage ? 'p-1' : ' px-3 py-2'}`
                            : `bg-[#EEBFFF] ${hasImage ? 'p-1' : ' px-3 py-2'}`
                          }`}
                      >
                        {showReply ? (
                          <View
                            className={`mb-2 rounded-xl px-3 py-2 ${isMe ? "bg-amber-100/80" : "bg-white/15"
                              }`}
                          >
                            <View className="flex-row items-center">
                              <View
                                className={`mr-2 h-full w-1 rounded-full ${isMe ? "bg-amber-500" : "bg-emerald-300"
                                  }`}
                              />
                              <View className="flex-1">
                                <Text
                                  className={`text-[10px] font-rubik-semibold ${isMe ? "text-slate-900" : "text-emerald-100"
                                    }`}
                                >
                                  {replyAuthor}
                                </Text>
                                <Text
                                  className={`text-xs font-rubik ${isMe ? "text-slate-700" : "text-slate-100"
                                    }`}
                                  numberOfLines={1}
                                >
                                  {replyLabel}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ) : null}

                        {hasImage ? (() => {
                          const size = getScaledSize(message.imageUrl, 260, () => {
                            listRef.current?.forceUpdate?.();
                          });

                          const scaledWidth = Math.min(size.width, 260);
                          const scaledHeight = (size.height / size.width) * scaledWidth;

                          return (
                            <Image
                              source={{ uri: message.imageUrl }}
                              style={{
                                width: scaledWidth,
                                height: scaledHeight,
                                borderRadius: 14,
                              }}
                              resizeMode="cover"
                            />
                          );
                        })() : null}

                        {message.message ? (
                          <Text
                            className={`${showEmojiOnly ? "text-4xl" : "text-base"
                              } font-rubik text-slate-900`}
                          >
                            {message.message}
                          </Text>
                        ) : null}

                        {timeLabel ? (
                          <View className={`mt-1 flex-row justify-end ${hasImage && 'absolute bottom-2 right-2'}`}>
                            <Text
                              className={`text-[10px] font-rubik ${hasImage ? 'text-white' : 'text-slate-600'}`}
                            >
                              {timeLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                );
              }}
              ListFooterComponent={
                loading && messages.length === 0 ? (
                  <View className="py-6 items-center">
                    <ActivityIndicator color="#e2e8f0" />
                  </View>
                ) : null
              }
            />

            <View className=" px-6 py-4">
              {isBlocked || isBlockedByOther ? (
                <View className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Text className="text-sm font-rubik text-slate-600">
                    {isBlockedByOther
                      ? "You cannot reply to this chat."
                      : "You blocked this chat."}
                  </Text>
                  {isBlocked && (
                    <TouchableOpacity
                      onPress={handleUnblock}
                      className="mt-3 items-center rounded-xl bg-pink-400 px-3 py-2"
                    >
                      <Text className="text-base font-rubik-semibold text-slate-800">
                        Unblock to message
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View>
                  {replyTarget ? (
                    <View className="mb-2 ml-2 rounded-2xl bg-white/80 px-3 py-2">
                      <View className="flex-row items-center">
                        <View className="mr-2 h-full w-1 rounded-full bg-amber-500" />
                        <View className="flex-1">
                          <Text className="text-[10px] font-rubik-semibold text-slate-700">
                            Replying to{" "}
                            {replyTarget.senderId === user?.id ? "You" : displayName}
                          </Text>
                          <Text
                            className="text-xs font-rubik text-slate-600"
                            numberOfLines={1}
                          >
                            {replyTarget.imageUrl
                              ? replyTarget.message
                                ? `Photo: ${replyTarget.message}`
                                : "Photo"
                              : replyTarget.message}
                          </Text>
                        </View>
                        <Pressable onPress={() => setReplyTarget(null)}>
                          <Ionicons name="close" size={16} color="#64748b" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                  {isTyping ? (
                    <View className="mb-2 ml-2">
                      <View className="self-start rounded-full bg-white/80 px-3 py-1">
                        <Text className="text-xs font-rubik text-slate-600">
                          Typing...
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {showEmojiPicker ? (
                    <View className="mb-2 flex-row flex-wrap gap-2 px-4">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <Pressable
                          key={emoji}
                          onPress={() => {
                            const next = `${text}${emoji}`;
                            setText(next);
                            emitTyping(true);
                            scheduleStopTyping();
                          }}
                          className="h-9 w-9 items-center justify-center rounded-full bg-white/80"
                        >
                          <Text className="text-lg">{emoji}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <View className="flex-row items-center px-4 gap-2">
                    <Pressable
                      onPress={handlePickImage}
                      className="h-9 w-9 items-center justify-center rounded-full bg-white/80"
                    >
                      <Ionicons name="camera" size={18} color="#64748b" />
                    </Pressable>
                    <Pressable
                      onPress={() => setShowEmojiPicker((prev) => !prev)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-white/80"
                    >
                      <Ionicons name="happy-outline" size={18} color="#64748b" />
                    </Pressable>
                    <View className="flex-1 bg-white flex-row items-center pl-4 rounded-full">
                      <TextInput
                        value={text}
                        onChangeText={(value) => {
                          setText(value);
                          if (value.trim().length > 0) {
                            emitTyping(true);
                            scheduleStopTyping();
                          } else {
                            emitTyping(false);
                          }
                        }}
                        placeholder="Type a message"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 text-sm font-rubik max-h-[100px] items-center"
                        multiline
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onBlur={() => emitTyping(false)}
                        onSubmitEditing={() => {
                          if (!isSendDisabled) {
                            handleSend();
                          }
                        }}
                      />

                      <TouchableOpacity
                        onPress={handleSend}
                        disabled={isSendDisabled}
                        className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${isSendDisabled ? "bg-white/5" : "bg-pink-400 "
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
                            color={isSendDisabled ? "#94a3b8" : "#FFF"}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
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
    </OnboardingBackground>
  );
}
