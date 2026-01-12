import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useChat } from "@/context/chat-context";

type ExploreUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  lastSeen?: string;
  isOnline?: boolean;
};

const Explore = () => {
  const router = useRouter();
  const { onlineUserIds } = useChat();
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<ExploreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    const response = await api.get<ExploreUser[]>("/user");
    if (Array.isArray(response)) {
      setAllUsers(response);
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        await fetchUsers();
      } catch {
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUsers();
    } catch {
      // Keep the existing list on refresh failure.
    } finally {
      setRefreshing(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return allUsers;
    }
    return allUsers.filter((user) =>
      user.username.toLowerCase().includes(normalized),
    );
  }, [allUsers, query]);

  const formatLastSeen = (value?: string) => {
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
            Explore
          </Text>
          <View className="mt-4 flex-row items-center rounded-full border border-white/10 bg-white/10 px-4">
            <Ionicons name="search" size={18} color="#cbd5f5" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search users"
              placeholderTextColor="#cbd5f5"
              className="ml-3 flex-1 text-sm text-white font-rubik"
            />
          </View>
          <Text className="mt-4 text-xs font-rubik-medium text-slate-200 uppercase">
            All users
          </Text>
        </View>

        <View className="mt-5 flex-1 px-6">
          <View className="flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6, paddingBottom: 80 }}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              renderItem={({ item, index }) => {
                const isLast = index === filteredUsers.length - 1;
                const isOnline = onlineUserIds.includes(item._id) || item.isOnline;
                const statusText = isOnline
                  ? "Active now"
                  : formatLastSeen(item.lastSeen);

                return (
                  <TouchableOpacity
                    onPress={() => {
                      const params: Record<string, string> = {
                        id: item._id,
                        username: item.username,
                      };
                      if (item.profilePhoto) {
                        params.profilePhoto = item.profilePhoto;
                      }
                      if (item.lastSeen) {
                        params.lastSeen = item.lastSeen;
                      }
                      router.push({ pathname: "/chat/[id]", params });
                    }}
                    className={`flex-row items-center px-4 py-3.5 ${isLast ? "" : "border-b border-white/10"}`}
                  >
                    <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                      {item.profilePhoto ? (
                        <Image
                          source={{ uri: item.profilePhoto }}
                          className="h-full w-full"
                        />
                      ) : (
                        <Ionicons name="person" size={22} color="#cbd5f5" />
                      )}
                  
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex gap-2 flex-row items-center">
                        <Text className="text-base text-white font-rubik-semibold">
                          {item.username ?? "Unknown"}
                        </Text>
                        {isOnline && (
                          <View className=" h-3 w-3 rounded-full border border-[#0f2633] bg-green-400 " />
                        )}
                      </View>

                      <Text className="mt-0.5 text-xs font-rubik text-slate-200">
                        {statusText}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5f5" />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                loading ? (
                  <View className="py-10 items-center">
                    <ActivityIndicator color="#e2e8f0" />
                  </View>
                ) : (
                  <View className="py-10 items-center">
                    <Text className="text-sm font-rubik text-slate-200">
                      No users found.
                    </Text>
                  </View>
                )
              }
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Explore;
