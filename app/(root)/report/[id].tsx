import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import type { Gender } from "@/context/onboarding-context";

type RemoteUser = {
  _id: string;
  username: string;
  profilePhoto?: string;
  profilePicture?: string;
  gender?: Gender;
};

const REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "fake", label: "Fake profile" },
  { value: "other", label: "Other" },
];

const ReportUser = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const userId = Array.isArray(id) ? id[0] : id;
  const [profile, setProfile] = useState<RemoteUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const displayPhoto = profile?.profilePhoto ?? profile?.profilePicture;

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

  const handleSubmit = async () => {
    if (!userId || !selectedReason) {
      showToast("Select a reason to continue.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/user/report", {
        reportedUserId: userId,
        reason: selectedReason,
        details: details.trim(),
      });
      showToast("Report submitted. Thank you!", "success");
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Report failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

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
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="chevron-back" size={18} color="#0f172a" />
            </Pressable>
            <Text className="text-lg font-rubik-semibold text-black-800">
              Report
            </Text>
            <View className="h-10 w-10" />
          </View>

          {loading ? (
            <View className="mt-10 items-center">
              <ActivityIndicator color="#0f172a" />
            </View>
          ) : (
            <>
              <View className="mt-6 rounded-3xl bg-white/85 px-5 py-4">
                <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
                  Reporting
                </Text>
                <View className="mt-3 flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/80">
                    {displayPhoto ? (
                      <Image
                        source={{
                          uri: displayPhoto,
                        }}
                        className="h-full w-full"
                      />
                    ) : (
                      <Ionicons name="person" size={20} color="#94a3b8" />
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-rubik-semibold text-slate-900">
                      {profile?.username ?? "User"}
                    </Text>
                    <Text className="text-xs font-rubik text-slate-500">
                      Help us keep chats safe for everyone.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-6 rounded-3xl bg-white/85 px-5 py-4">
                <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
                  Reason
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {REPORT_REASONS.map((reason) => {
                    const active = selectedReason === reason.value;
                    return (
                      <Pressable
                        key={reason.value}
                        onPress={() => setSelectedReason(reason.value)}
                        className={`rounded-full px-4 py-2 ${
                          active ? "bg-rose-200" : "bg-slate-200"
                        }`}
                      >
                        <Text className="text-xs font-rubik text-slate-700">
                          {reason.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6 rounded-3xl bg-white/85 px-5 py-4">
                <Text className="text-xs font-rubik-medium text-slate-500 uppercase">
                  Details (optional)
                </Text>
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Share any extra context"
                  placeholderTextColor="#94a3b8"
                  multiline
                  className="mt-3 min-h-[120px] rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-rubik text-slate-900"
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!selectedReason || submitting}
                className={`mt-6 items-center rounded-full py-4 ${
                  !selectedReason || submitting ? "bg-white/60" : "bg-white"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text className="text-base font-rubik-semibold text-slate-900">
                    Submit report
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </OnboardingBackground>
  );
};

export default ReportUser;
