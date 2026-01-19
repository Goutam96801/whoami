import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import OnboardingBackground from "@/components/OnboardingBackground";
import { INTEREST_OPTIONS } from "@/constants/constant";
import type { Gender } from "@/context/onboarding-context";
import { ProfileCard } from "@/components/profile/profileCard";

type RemoteUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  isOnline?: boolean;
  lastSeen?: string;
  interests?: string[];
  gender?: Gender;
  updatedAt?: string;
};

const interestLookup = new Map(
  INTEREST_OPTIONS.map((option) => [option.value.toLowerCase(), option]),
);

const toTitle = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());

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

const UserProfile = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const userId = Array.isArray(id) ? id[0] : id;
  const [profile, setProfile] = useState<RemoteUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const response = await api.get<{ user: RemoteUser }>(`/user/${userId}`);
        if (response?.user) {
          setProfile(response.user);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const displayPhoto = profile?.profilePhoto ?? profile?.profilePicture;
  const displayAge = getAgeFromDob(profile?.dateOfBirth);
  const statusText = profile?.isOnline
    ? "Online"
    : formatLastSeen(profile?.lastSeen ?? profile?.updatedAt);

  const interestChips = useMemo(() => {
    return (profile?.interests ?? [])
      .map((interest) => {
        const key = interest.trim().toLowerCase();
        const option = interestLookup.get(key);
        return {
          label: option?.label ?? toTitle(interest),
          emoji: option?.emoji,
        };
      })
      .filter((item) => item.label.length > 0);
  }, [profile?.interests]);

  return (
    <OnboardingBackground gender={profile?.gender}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-28 pt-4"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-lg bg-white"
            >
              <Ionicons name="chevron-back" size={18} color="#0f172a" />
            </Pressable>
            <Text className="text-lg font-rubik-semibold text-black-800">
              Profile
            </Text>
            <View className="h-10 w-10" />
          </View>

          {loading ? (
            <View className="mt-10 items-center">
              <ActivityIndicator color="#0f172a" />
            </View>
          ) : profile ? (
            <>
              <View className="mt-20">
                <ProfileCard
                  id={userId}
                  username={profile.username}
                  profilePhoto={displayPhoto}
                  isOnline={profile.isOnline}
                  statusText={statusText}
                  age={displayAge}
                  interests={profile.interests}
                  onReportPress={() => {
                    if (!userId) {
                      return;
                    }
                    router.push({ pathname: "/report/[id]", params: { id: userId } });
                  }}
                />
              </View>

              <View className="mt-6 rounded-3xl bg-white/85 px-5 py-4">
                <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
                  About
                </Text>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {typeof displayAge === "number" ? (
                    <View className="rounded-full bg-slate-100 px-3 py-1.5">
                      <Text className="text-xs font-rubik text-slate-600">
                        {displayAge} years
                      </Text>
                    </View>
                  ) : null}
                  {profile.gender ? (
                    <View className="rounded-full bg-slate-100 px-3 py-1.5">
                      <Text className="text-xs font-rubik text-slate-600">
                        {profile.gender}
                      </Text>
                    </View>
                  ) : null}
                  <View className="rounded-full bg-slate-100 px-3 py-1.5">
                    <Text className="text-xs font-rubik text-slate-600">
                      {statusText}
                    </Text>
                  </View>
                </View>

                {interestChips.length ? (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {interestChips.map((interest) => (
                      <View
                        key={`${interest.label}-${interest.emoji ?? "text"}`}
                        className="flex-row items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5"
                      >
                        {interest.emoji ? (
                          <Text className="text-sm">{interest.emoji}</Text>
                        ) : null}
                        <Text className="text-xs font-rubik-medium text-slate-700">
                          {interest.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-100/60 px-4 py-3">
                    <Text className="text-center text-xs font-rubik text-slate-500">
                      No interests shared yet.
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => {
                  if (!userId) {
                    return;
                  }
                  router.push({ pathname: "/chat/[id]", params: { id: userId } });
                }}
                className="mt-6 items-center rounded-full bg-white py-4"
              >
                <Text className="text-base font-rubik-semibold text-slate-900">
                  Message
                </Text>
              </Pressable>
            </>
          ) : (
            <View className="mt-10 items-center">
              <Text className="text-sm font-rubik text-slate-600">
                User not found.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </OnboardingBackground>
  );
};

export default UserProfile;
