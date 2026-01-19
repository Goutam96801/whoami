import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import icons from "@/constants/icons";
import { useAuth } from "@/context/auth-context";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import OnboardingBackground from "@/components/OnboardingBackground";
import { INTEREST_OPTIONS } from "@/constants/constant";
import type { Gender } from "@/context/onboarding-context";
import {
  getNotificationPreferences,
  requestNotificationPermission,
  setNotificationPreferences,
} from "@/lib/notifications";

interface SettingsItemProp {
  icon: ImageSourcePropType;
  title: string;
  onPress?: () => void;
  textStyle?: string;
  iconTint?: string;
  showArrow?: boolean;
}

type CurrentUserDetails = {
  _id: string;
  username: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  isOnline?: boolean;
  lastSeen?: string;
  interests?: string[];
  gender?: Gender;
  updatedAt?: string;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

const SettingsItem = ({
  icon,
  title,
  onPress,
  textStyle,
  iconTint,
  showArrow = true,
}: SettingsItemProp) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-row items-center justify-between py-3"
  >
    <View className="flex flex-row items-center gap-3">
      <Image
        source={icon}
        className="size-6"
        style={{ tintColor: iconTint ?? "#475569" }}
      />
      <Text className={`text-base font-rubik-medium text-slate-700 ${textStyle ?? ""}`}>
        {title}
      </Text>
    </View>

    {showArrow && (
      <Image source={icons.rightArrow} className="size-5" style={{ tintColor: "#94a3b8" }} />
    )}
  </TouchableOpacity>
);

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

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const sameInterests = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const Profile = () => {
  const { user, signOut, updateProfile, uploadProfilePhoto, deleteAccount } =
    useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [details, setDetails] = useState<CurrentUserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [gender, setGender] = useState<Gender | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [dateValue, setDateValue] = useState<Date>(new Date(2005, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    setUsername(user?.username ?? "");
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get<{ user: CurrentUserDetails }>("/user/me");
        if (response?.user) {
          setDetails(response.user);
        }
      } catch {
        setDetails(null);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadNotificationPrefs = async () => {
      try {
        const prefs = await getNotificationPreferences();
        setNotificationsEnabled(prefs.enabled);
        setMessageNotifications(prefs.message);
        setMatchNotifications(prefs.match);
      } catch {
        setNotificationsEnabled(false);
        setMessageNotifications(true);
        setMatchNotifications(true);
      }
    };

    loadNotificationPrefs();
  }, []);

  useEffect(() => {
    if (!details) {
      return;
    }
    setGender(details.gender ?? null);
    setInterests(details.interests ?? []);
    if (details.dateOfBirth) {
      const parsed = new Date(details.dateOfBirth);
      if (!Number.isNaN(parsed.getTime())) {
        setDateValue(parsed);
      }
    }
    setUsername(details.username ?? user?.username ?? "");
  }, [details, user?.username]);

  useEffect(() => {
    if (!editing) {
      setUsernameStatus("idle");
      return;
    }
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    const currentName = details?.username ?? user?.username;
    if (trimmed === currentName) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const response = await api.get<{ available: boolean }>(
          `/user/username/check?username=${encodeURIComponent(trimmed)}`,
        );
        setUsernameStatus(response.available ? "available" : "taken");
      } catch {
        setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, editing, details?.username, user?.username]);

  const handleSelectGender = (value: Gender) => {
    setGender(value);
  };

  const handleLogout = async () => {
    await signOut();
    showToast("Logged out successfully", "success");
  };

  const handleEditToggle = () => {
    if (editing) {
      setUsername(details?.username ?? user?.username ?? "");
      setGender(details?.gender ?? null);
      setInterests(details?.interests ?? []);
      if (details?.dateOfBirth) {
        const parsed = new Date(details.dateOfBirth);
        if (!Number.isNaN(parsed.getTime())) {
          setDateValue(parsed);
        }
      }
      setEditing(false);
      return;
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (usernameStatus === "checking") {
      showToast("Checking username availability...", "warning");
      return;
    }
    if (usernameStatus === "taken") {
      showToast("Username is already taken.", "error");
      return;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      showToast("Username is required.", "error");
      return;
    }

    const payload: {
      username?: string;
      gender?: Gender;
      dateOfBirth?: string;
      interests?: string[];
    } = {};

    const currentName = details?.username ?? user?.username;
    if (trimmedUsername !== currentName) {
      payload.username = trimmedUsername;
    }

    if (gender && gender !== details?.gender) {
      payload.gender = gender;
    }

    const nextDob = formatDateInput(dateValue);
    const currentDob = details?.dateOfBirth
      ? formatDateInput(new Date(details.dateOfBirth))
      : null;
    if (currentDob !== nextDob) {
      payload.dateOfBirth = nextDob;
    }

    if (!sameInterests(details?.interests ?? [], interests)) {
      payload.interests = interests;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const result = await updateProfile(payload);
    setSaving(false);

    if (result.ok) {
      setEditing(false);
      setDetails((prev) =>
        prev
          ? {
            ...prev,
            username: payload.username ?? prev.username,
            gender: payload.gender ?? prev.gender,
            dateOfBirth: payload.dateOfBirth
              ? new Date(payload.dateOfBirth).toISOString()
              : prev.dateOfBirth,
            interests: payload.interests ?? prev.interests,
          }
          : prev,
      );
      showToast("Profile updated successfully.", "success");
    } else {
      showToast(result.error ?? "Something went wrong.", "error");
    }
  };

  const handlePickImage = async () => {
    if (uploading) {
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Permission needed. Allow access to pick a profile photo.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }
    const asset = result.assets[0];
    if (!asset.base64) {
      showToast("Unable to read the selected image.", "error");
      return;
    }

    const mimeType = asset.mimeType ?? "image/jpeg";
    const dataUri = `data:${mimeType};base64,${asset.base64}`;

    setUploading(true);
    const uploadResult = await uploadProfilePhoto(dataUri);
    setUploading(false);

    if (uploadResult.ok) {
      showToast("Profile photo updated.", "success");
    } else {
      showToast(uploadResult.error ?? "Something went wrong.", "error");
    }
  };

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      await setNotificationPreferences({ enabled: false });
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      showToast("Please enable notifications in settings.", "warning");
      await setNotificationPreferences({ enabled: false });
      setNotificationsEnabled(false);
      return;
    }
    setNotificationsEnabled(true);
    await setNotificationPreferences({ enabled: true });
  };

  const handleToggleMessageNotifications = async () => {
    const next = !messageNotifications;
    setMessageNotifications(next);
    await setNotificationPreferences({ message: next });
  };

  const handleToggleMatchNotifications = async () => {
    const next = !matchNotifications;
    setMatchNotifications(next);
    await setNotificationPreferences({ match: next });
  };

  const displayAge = getAgeFromDob(details?.dateOfBirth ?? user?.dateOfBirth);
  const statusText = details?.isOnline
    ? "Online"
    : formatLastSeen(details?.lastSeen ?? details?.updatedAt);

  const interestChips = useMemo(() => {
    return (details?.interests ?? [])
      .map((interest) => {
        const key = interest.trim().toLowerCase();
        const option = interestLookup.get(key);
        return {
          label: option?.label ?? toTitle(interest),
          emoji: option?.emoji,
        };
      })
      .filter((item) => item.label.length > 0);
  }, [details?.interests]);

  const showUsernameMessage =
    editing &&
    username.trim().length >= 3 &&
    username.trim() !== (details?.username ?? user?.username) &&
    usernameStatus !== "idle";

  const usernameMessage =
    usernameStatus === "checking"
      ? "Checking availability..."
      : usernameStatus === "available"
        ? "Username is available"
        : usernameStatus === "taken"
          ? "Username is already taken"
          : usernameStatus === "error"
            ? "Unable to check username right now"
            : "";

  const backgroundGender = editing ? gender ?? details?.gender : details?.gender;

  return (
    <OnboardingBackground gender={backgroundGender}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-32 pt-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-rubik-bold text-black-800">Profile</Text>
            <TouchableOpacity
              onPress={handleEditToggle}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <Ionicons
                name={editing ? "close" : "create-outline"}
                size={18}
                color="#0f172a"
              />
            </TouchableOpacity>
          </View>

          <View className="relative mt-28 rounded-3xl bg-white/90 px-6 py-6 shadow-md">
            <View className="items-center">
              <TouchableOpacity
                disabled={!editing || uploading}
                onPress={editing ? handlePickImage : undefined}
                className="absolute bottom-14 h-28 w-28 items-center justify-center overflow-hidden"
              >
                {user?.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} className="h-full w-full" />
                ) : (
                  <Ionicons name="person" size={42} color="#94a3b8" />
                )}
                {editing ? (
                  <View className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-amber-400">
                    {uploading ? (
                      <ActivityIndicator color="#0f172a" size="small" />
                    ) : (
                      <Ionicons name="camera" size={16} color="#0f172a" />
                    )}
                  </View>
                ) : (
                  <View className="absolute top-2 left-1 h-3 w-3 rounded-full border border-white bg-emerald-400" />
                )}
              </TouchableOpacity>
              <Text className="mt-4 text-2xl font-rubik-bold text-slate-900">
                {user?.username ?? "Guest"}
                {typeof displayAge === "number" ? `, ${displayAge}` : ""}
              </Text>
              <Text
                className={`text-xs font-rubik ${details?.isOnline ? "text-emerald-400" : "text-slate-500"
                  }`}
              >
                {loadingDetails ? "Loading status..." : statusText}
              </Text>
            </View>

            {editing ? (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {INTEREST_OPTIONS.map((option) => {
                  const active = interests.includes(option.value);
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => toggleInterest(option.value)}
                      className={`rounded-full px-3 py-1.5 ${active ? "bg-rose-200" : "bg-slate-200"
                        }`}
                    >
                      <Text className="text-xs">
                        {option.emoji} {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : interestChips.length ? (
              <View className="mt-4 flex-row flex-wrap justify-center gap-2">
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
                  Add interests so people can discover you.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-6 rounded-3xl bg-white/80 px-5 py-4">
            <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
              Profile details
            </Text>
            <View className="mt-4">
              <Text className="text-xs font-rubik text-slate-500">Username</Text>
              {editing ? (
                <View className="relative mt-2">
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#94a3b8"
                    className="rounded-2xl border border-white/60 bg-white px-4 py-3 pr-12 text-sm font-rubik text-slate-900"
                    autoCapitalize="none"
                  />
                  <View className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" ? (
                      <ActivityIndicator color="#64748b" size="small" />
                    ) : usernameStatus === "available" ? (
                      <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    ) : usernameStatus === "taken" ? (
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text className="mt-2 text-base font-rubik text-slate-900">
                  {user?.username ?? "Guest"}
                </Text>
              )}
              {showUsernameMessage ? (
                <Text
                  className={`mt-2 text-xs font-rubik ${usernameStatus === "available"
                      ? "text-emerald-500"
                      : usernameStatus === "taken"
                        ? "text-rose-500"
                        : "text-slate-500"
                    }`}
                >
                  {usernameMessage}
                </Text>
              ) : null}
            </View>

            <View className="mt-4">
              <Text className="text-xs font-rubik text-slate-500">Gender</Text>
              {editing ? (
                <View className="mt-3 flex-row gap-2">
                  {([
                    { label: "Female", value: "female", icon: "\u2640" },
                    { label: "Male", value: "male", icon: "\u2642" },
                    { label: "Other", value: "other", icon: "\u26A7" },
                  ] as const).map((option) => {
                    const active = gender === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => handleSelectGender(option.value)}
                        className={`flex-1 items-center rounded-2xl border px-3 py-3 ${active ? "border-white bg-rose-200" : "border-white bg-white"
                          }`}
                      >
                        <Text className="text-2xl">{option.icon}</Text>
                        <Text className="mt-1 text-xs font-rubik-medium text-slate-700">
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-2 text-base font-rubik text-slate-900">
                  {details?.gender ?? "Not set"}
                </Text>
              )}
            </View>

            <View className="mt-4">
              <Text className="text-xs font-rubik text-slate-500">Date of birth</Text>
              {editing ? (
                <View className="mt-2">
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className="flex-row items-center justify-between rounded-2xl border border-white/60 bg-white px-4 py-3"
                  >
                    <Text className="text-sm font-rubik text-slate-900">
                      {formatDateInput(dateValue)}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dateValue}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      maximumDate={new Date(2010, 1, 1)}
                      minimumDate={new Date(1950, 1, 1)}
                      onChange={(_, selectedDate) => {
                        if (selectedDate) {
                          setDateValue(selectedDate);
                        }
                        if (Platform.OS === "android") {
                          setShowDatePicker(false);
                        }
                      }}
                      textColor="#000"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </View>
              ) : (
                <Text className="mt-2 text-base font-rubik text-slate-900">
                  {details?.dateOfBirth
                    ? new Date(details.dateOfBirth).toLocaleDateString()
                    : "Not set"}
                </Text>
              )}
            </View>

            {editing && (
              <View className="mt-5 flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className="flex-1 items-center rounded-2xl bg-amber-400 px-4 py-3"
                >
                  {saving ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text className="text-sm font-rubik-semibold text-slate-900">
                      Save changes
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEditToggle}
                  className="flex-1 items-center rounded-2xl border border-white/60 bg-white px-4 py-3"
                >
                  <Text className="text-sm font-rubik text-slate-600">Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View className="mt-6 rounded-3xl bg-white/80 px-5 py-4">
            <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
              Notifications
            </Text>
            <View className="mt-3">
              <Pressable
                onPress={handleToggleNotifications}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="notifications" size={20} color="#475569" />
                  <Text className="text-base font-rubik-medium text-slate-700">
                    Enable notifications
                  </Text>
                </View>
                <View
                  className={`h-6 w-11 rounded-full p-1 ${notificationsEnabled ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                >
                  <View
                    className={`h-4 w-4 rounded-full bg-white shadow ${notificationsEnabled ? "ml-auto" : "mr-auto"
                      }`}
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={handleToggleMessageNotifications}
                disabled={!notificationsEnabled}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="chatbubble-ellipses" size={20} color="#475569" />
                  <Text
                    className={`text-base font-rubik-medium ${notificationsEnabled ? "text-slate-700" : "text-slate-400"
                      }`}
                  >
                    Message alerts
                  </Text>
                </View>
                <View
                  className={`h-6 w-11 rounded-full p-1 ${messageNotifications && notificationsEnabled
                      ? "bg-emerald-400"
                      : "bg-slate-200"
                    }`}
                >
                  <View
                    className={`h-4 w-4 rounded-full bg-white shadow ${messageNotifications && notificationsEnabled ? "ml-auto" : "mr-auto"
                      }`}
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={handleToggleMatchNotifications}
                disabled={!notificationsEnabled}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="sparkles" size={20} color="#475569" />
                  <Text
                    className={`text-base font-rubik-medium ${notificationsEnabled ? "text-slate-700" : "text-slate-400"
                      }`}
                  >
                    Search match alerts
                  </Text>
                </View>
                <View
                  className={`h-6 w-11 rounded-full p-1 ${matchNotifications && notificationsEnabled
                      ? "bg-emerald-400"
                      : "bg-slate-200"
                    }`}
                >
                  <View
                    className={`h-4 w-4 rounded-full bg-white shadow ${matchNotifications && notificationsEnabled ? "ml-auto" : "mr-auto"
                      }`}
                  />
                </View>
              </Pressable>
            </View>
          </View>


          <View className="mt-6 rounded-3xl bg-white/80 px-5 py-4">
            <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
              Account
            </Text>
            <View className="mt-3">
              <SettingsItem
                icon={icons.logout}
                title="Logout"
                textStyle="text-rose-500"
                iconTint="#f87171"
                showArrow={false}
                onPress={handleLogout}
              />
              <TouchableOpacity
                onPress={() => setShowDeleteModal(true)}
                className="flex flex-row items-center justify-between py-3"
              >
                <View className="flex flex-row items-center gap-3">
                  <Ionicons name="trash-outline" size={20} color="#f87171" />
                  <Text className="text-base font-rubik-medium text-rose-500">
                    Delete account
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>


          <ConfirmActionModal
            visible={showDeleteModal}
            title="Delete account"
            description="This will permanently delete your account and all associated data. This action cannot be undone."
            confirmText="Delete account"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              if (!user) {
                showToast("Authentication error", "error");
                return;
              }

              const response = await deleteAccount();
              if (!response?.ok) {
                showToast("Failed to delete account", "error");
                return;
              }

              await signOut();
              showToast("Account deleted successfully", "success");
              router.replace("/welcome");
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </OnboardingBackground>
  );
};

export default Profile;
