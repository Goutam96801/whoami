import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useChat } from "@/context/chat-context";
import { useToast } from "@/components/ToastProvider";
import type { Gender } from "@/context/onboarding-context";
import OnboardingBackground from "@/components/OnboardingBackground";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { INTEREST_OPTIONS } from "@/constants/constant";
import { sendLocalNotification } from "@/lib/notifications";

type ExploreUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  lastSeen?: string;
  isOnline?: boolean;
  gender?: Gender;
  dateOfBirth?: string;
  interests?: string[];
  age?: number;
};

const GENDER_FILTERS = [
  { value: "anyone", label: "Anyone", emoji: "\uD83E\uDDD1" },
  { value: "girls", label: "Girls", emoji: "\uD83D\uDC6D" },
  { value: "boys", label: "Boys", emoji: "\uD83D\uDC6C" },
] as const;

type GenderFilter = (typeof GENDER_FILTERS)[number]["value"];


const SEARCH_INTERVAL_MS = 4500;
const MIN_AGE = 13;
const MAX_AGE = 99;

const shuffle = <T,>(list: T[]) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

const filterUsersForSearch = (
  users: ExploreUser[],
  minAge: number,
  maxAge: number,
  genderPreference: GenderFilter,
  interests: string[],
) => {
  const normalizedInterests = interests.map((interest) =>
    interest.toLowerCase(),
  );
  const targetGender =
    genderPreference === "girls"
      ? "female"
      : genderPreference === "boys"
        ? "male"
        : null;

  return users.filter((user) => {
    if (targetGender && user.gender && user.gender !== targetGender) {
      return false;
    }
    const userAge =
      typeof user.age === "number"
        ? user.age
        : getAgeFromDob(user.dateOfBirth);
    if (userAge !== null && (userAge < minAge || userAge > maxAge)) {
      return false;
    }
    if (normalizedInterests.length) {
      if (!Array.isArray(user.interests) || user.interests.length === 0) {
        return false;
      }
      const hasMatch = user.interests.some((interest) => {
        const normalized = interest.toLowerCase();
        return normalizedInterests.includes(normalized);
      });
      if (!hasMatch) {
        return false;
      }
    }
    return true;
  });
};

const Explore = () => {
  const router = useRouter();
  const { onlineUserIds } = useChat();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<ExploreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"browse" | "filters" | "searching">(
    "filters",
  );
  const [selectedGender, setSelectedGender] = useState<GenderFilter>("anyone");
  const [ageMin, setAgeMin] = useState(MIN_AGE);
  const [ageMax, setAgeMax] = useState(35);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [matches, setMatches] = useState<ExploreUser[]>([]);
  const [searchComplete, setSearchComplete] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const searchQueueRef = useRef<ExploreUser[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (mode !== "searching") {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      return;
    }

    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    if (searchQueueRef.current.length === 0) {
      setSearchComplete(true);
      return;
    }

    const intervalId = setInterval(() => {
      const next = searchQueueRef.current.shift();
      if (!next) {
        setSearchComplete(true);
        if (searchTimerRef.current) {
          clearInterval(searchTimerRef.current);
          searchTimerRef.current = null;
        }
        return;
      }
      setMatches((prev) => [...prev, next]);
      sendLocalNotification("match", {
        title: "Match found",
        body: `${next.username ?? "Someone"} is ready to chat.`,
        data: { userId: next._id },
      }).catch(() => null);
    }, SEARCH_INTERVAL_MS);

    searchTimerRef.current = intervalId;

    return () => {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [mode, showToast]);

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

  const searchSummary = useMemo(() => {
    const genderLabel =
      selectedGender === "girls"
        ? "Girls"
        : selectedGender === "boys"
          ? "Boys"
          : "Anyone";
    const firstInterest = selectedInterests[0];
    const firstInterestLabel =
      INTEREST_OPTIONS.find((option) => option.value === firstInterest)?.label ??
      firstInterest;
    const interestLabel = selectedInterests.length
      ? `${firstInterestLabel}${selectedInterests.length > 1 ? ` +${selectedInterests.length - 1}` : ""}`
      : "Any topic";
    return `${genderLabel} | ${ageMin}-${ageMax} yo | ${interestLabel}`;
  }, [ageMax, ageMin, selectedGender, selectedInterests]);

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

  const handleOpenUser = (user: ExploreUser) => {
    const params: Record<string, string> = {
      id: user._id,
      username: user.username,
    };
    if (user.profilePhoto) {
      params.profilePhoto = user.profilePhoto;
    }
    if (user.lastSeen) {
      params.lastSeen = user.lastSeen;
    }
    router.push({ pathname: "/chat/[id]", params });
  };

  const toggleInterest = (value: string) => {
    setSelectedInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleStartSearch = () => {
    const minAge = Math.min(ageMin, ageMax);
    const maxAge = Math.max(ageMin, ageMax);
    const pool = shuffle(
      filterUsersForSearch(
        allUsers,
        minAge,
        maxAge,
        selectedGender,
        selectedInterests,
      ),
    );
    searchQueueRef.current = pool;
    setMatches([]);
    setSearchComplete(pool.length === 0);
    setMode("searching");
  };

  const handleCancelSearch = () => {
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    searchQueueRef.current = [];
    setMatches([]);
    setSearchComplete(false);
    setMode("filters");
  };

  const renderUserItem = (users: ExploreUser[]) => {
    function RenderUserItem({
      item,
      index,
    }: {
      item: ExploreUser;
      index: number;
    }) {
      const isLast = index === users.length - 1;
      const isOnline = onlineUserIds.includes(item._id) || item.isOnline;
      const statusText = isOnline ? "Active now" : formatLastSeen(item.lastSeen);

      return (
        <Pressable
          onPress={() => handleOpenUser(item)}
          className={`flex-row items-center py-3.5 ${isLast ? "" : "border-b border-white/10"}`}
        >
          <View className="h-12 w-12 items-center justify-center">
            {item.profilePhoto ? (
              <Image
                source={{ uri: item.profilePhoto }}
                className="h-full w-full"
              />
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
        </Pressable>
      );
    }

    return RenderUserItem;
  };

  const renderBrowse = () => (
    <>
      <View className="px-6 pt-2">
        <Text className="text-center text-lg font-rubik-semibold text-black-800">
          Explore
        </Text>
        <View className="mt-4 flex-row items-center justify-center rounded-full border border-white bg-white/10 px-4">
          <Ionicons name="search" size={20} color="#EB7CCF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search users"
            placeholderTextColor="#EB7CCF"
            selectionColor="#EB7CCF"
            className="ml-3 flex-1 text-sm text-black-800 font-rubik"
          />
        </View>
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-xs font-rubik-medium text-black-600 uppercase">
            All users
          </Text>
          <Pressable
            onPress={() => setMode("filters")}
            className="rounded-full bg-white px-4 py-2"
          >
            <Text className="text-xs font-rubik-semibold text-slate-900">
              Search active
            </Text>
          </Pressable>
        </View>
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
            renderItem={renderUserItem(filteredUsers)}
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
    </>
  );

  const renderFilters = () => (
    <View className="flex-1">
      <View className="px-6 pt-2">
        <View className="items-center justify-center">
          <Text className="text-lg font-rubik-semibold text-black-800">
            Search for chats
          </Text>
        </View>
      </View>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mt-6 text-xs uppercase font-rubik-medium text-black-600 text-center">
          {"I'm looking for"}
        </Text>
        <View className="mt-3 rounded-3xl bg-white/50">
          <View className="flex-row gap-2">
            {GENDER_FILTERS.map((option) => {
              const isSelected = selectedGender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSelectedGender(option.value)}
                  className={`flex-1 items-center gap-2 rounded-3xl px-3 py-6 ${isSelected ? "bg-white" : "bg-transparent"}`}
                >
                  <Text className="text-3xl">{option.emoji}</Text>
                  <Text
                    className={`text-xs font-rubik-semibold ${isSelected ? "text-black-800" : "text-black-600"}`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text className="mt-7 text-xs uppercase font-rubik-medium text-black-600 text-center">
          In age range
        </Text>
        <View
          className="mt-4 w-full"
          onLayout={(event) =>
            setSliderWidth(event.nativeEvent.layout.width)
          }
        >
          {sliderWidth > 0 ? (
            <RangeSlider
              sliderWidth={sliderWidth}
              min={13}
              max={99}
              step={1}
              minValue={ageMin}
              maxValue={ageMax}
              onValueChange={({ max, min }) => {
                setAgeMax(max);
                setAgeMin(min);
              }}
            />
          ) : null}
        </View>

        <Text className="mt-7 text-xs uppercase font-rubik-medium text-black-600 text-center">
          Who is interested in
        </Text>
        <View className="mt-3 flex-row flex-wrap justify-center gap-2">
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = selectedInterests.includes(interest.value);
            return (
              <Pressable
                key={interest.value}
                onPress={() => toggleInterest(interest.value)}
                className={`flex-row items-center gap-1 rounded-full border px-3 py-2 ${isSelected ? "border-white bg-white" : "border-white/60 bg-white/30"}`}
              >
                <Text className="text-base">{interest.emoji}</Text>
                <Text
                  className={`text-base font-rubik-medium ${isSelected ? "text-black-800" : "text-black-600"}`}
                >
                  {interest.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleStartSearch}
          className="mt-8 items-center rounded-full bg-white py-4"
        >
          <Text className="text-base font-rubik-semibold text-slate-900">
            Start searching
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  const renderSearching = () => {
    if (matches.length === 0) {
      return (
        <View className="flex-1 px-6 pb-10">
          <View className="pt-2">
            <Text className="text-center text-lg font-rubik-semibold text-black-800">
              Search active
            </Text>
          </View>
          <View className="items-center pt-8">
            <View className="rounded-full bg-white/70 px-4 py-2">
              <Text className="text-xs font-rubik-medium text-black-800">
                {searchSummary}
              </Text>
            </View>
            <Text className="mt-6 text-2xl font-rubik-bold text-black-800 text-center">
              {"We're looking for interesting chats"}
            </Text>
            <Text className="mt-2 text-sm font-rubik text-black-700 text-center">
              {searchComplete ? "No matches yet." : "We'll notify you when it's ready."}
            </Text>
            <View className="mt-8 h-28 w-28 items-center justify-center rounded-full bg-white/70">
              <Text className="text-6xl">🤔</Text>
            </View>
          </View>
          <Pressable onPress={handleCancelSearch} className="mt-auto mb-16 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons name="close" size={22} color="#0f172a" />
            </View>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 px-6 pb-8">
        <View className="pt-2">
          <Text className="text-center text-lg font-rubik-semibold text-black-800">
            Search active
          </Text>
        </View>
        <View className="items-center pt-6">
          <View className="rounded-full bg-white/70 px-4 py-2">
            <Text className="text-xs font-rubik-medium text-black-800">
              {searchSummary}
            </Text>
          </View>
          <Pressable onPress={handleCancelSearch} className="mt-6 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Ionicons name="close" size={22} color="#0f172a" />
            </View>
          </Pressable>
        </View>
        <View className="mt-6 flex-1">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-rubik-medium uppercase text-black-800">
              Matches {" "}
              <Text className="text-base">{
                matches.length < 5
                  ? '😎'
                  : matches.length < 10
                    ? '👀'
                    : matches.length > 15 ? '🥰'
                      : '🔥'
              }
              </Text>
            </Text>
            <Text className="text-xs font-rubik text-black-800">
              {matches.length} found
            </Text>
          </View>
          <View className="flex-1">
            <FlatList
              data={matches}
              keyExtractor={(item) => item._id}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6, paddingBottom: 16 }}
              renderItem={renderUserItem(matches)}
            />
          </View>
          {!searchComplete ? (
            <Text className="mt-3 text-xs font-rubik text-black-700 text-center">
              Searching continues in the background.
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingBackground>
        <SafeAreaView className="flex-1">
          {mode === "browse"
            ? renderBrowse()
            : mode === "filters"
              ? renderFilters()
              : renderSearching()}
        </SafeAreaView>
      </OnboardingBackground>
    </GestureHandlerRootView>
  );
};

export default Explore;
