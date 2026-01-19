import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import OnboardingBackground from "@/components/OnboardingBackground";
import {
  clearNotificationLog,
  getNotificationLog,
  NotificationLogItem,
} from "@/lib/notifications";

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getNotificationIcon = (type: NotificationLogItem["type"]) => {
  if (type === "message") {
    return { name: "chatbubble-ellipses", color: "#3b82f6" } as const;
  }
  return { name: "sparkles", color: "#f59e0b" } as const;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(() => {
    let active = true;
    setLoading(true);
    getNotificationLog()
      .then((items) => {
        if (active) {
          setNotifications(items);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadNotifications);

  const handleClear = async () => {
    await clearNotificationLog();
    setNotifications([]);
  };

  return (
    <OnboardingBackground>
      <SafeAreaView className="flex-1">
        <View className="px-6 pt-2 pb-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="chevron-back" size={18} color="#0f172a" />
            </Pressable>
            <Text className="text-lg font-rubik-semibold text-black-800">
              Notifications
            </Text>
            <Pressable
              onPress={handleClear}
              className="h-10 items-center justify-center rounded-full bg-white px-4"
            >
              <Text className="text-xs font-rubik-semibold text-slate-700">
                Clear
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerClassName="px-6 pb-24">
          {loading ? (
            <View className="items-center py-10">
              <Text className="text-sm font-rubik text-slate-600">
                Loading notifications...
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View className="items-center py-16">
              <Ionicons name="notifications-off" size={40} color="#94a3b8" />
              <Text className="mt-3 text-sm font-rubik text-slate-600">
                No notifications yet.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {notifications.map((item) => {
                const icon = getNotificationIcon(item.type);
                return (
                  <View
                    key={item.id}
                    className="rounded-3xl bg-white/85 px-4 py-3 shadow-sm"
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="mt-1 h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <Ionicons name={icon.name} size={18} color={icon.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-rubik-semibold text-slate-900">
                          {item.title}
                        </Text>
                        {item.body ? (
                          <Text className="mt-1 text-xs font-rubik text-slate-600">
                            {item.body}
                          </Text>
                        ) : null}
                        <Text className="mt-2 text-[10px] font-rubik text-slate-400">
                          {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
