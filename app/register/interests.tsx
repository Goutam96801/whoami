import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import OnboardingBackground from "@/components/OnboardingBackground";
import { useOnboarding } from "@/context/onboarding-context";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ToastProvider";
import { Ionicons } from "@expo/vector-icons";
import { INTEREST_OPTIONS } from "@/constants/constant";

export default function RegisterInterests() {
  const router = useRouter();
  const { draft, updateDraft, resetDraft } = useOnboarding();
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string[]>(draft.interests);
  const [submitting, setSubmitting] = useState(false);

  const toggleInterest = (value: string) => {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleComplete = async (overrideInterests?: string[]) => {
    if (submitting) {
      return;
    }
    if (
      !draft.username ||
      !draft.password ||
      !draft.confirmPassword ||
      !draft.gender ||
      !draft.dateOfBirth
    ) {
      showToast("Please complete earlier steps first.", "warning");
      router.replace("/register/credentials");
      return;
    }

    setSubmitting(true);
    const interests = overrideInterests ?? selected;
    updateDraft({ interests });
    console.log(interests);
    const result = await signUp({
      username: draft.username.trim(),
      password: draft.password,
      confirmPassword: draft.confirmPassword,
      gender: draft.gender,
      dateOfBirth: draft.dateOfBirth,
      profilePhoto: draft.profilePhoto || undefined,
      interests,
    });
    console.log(interests)
    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error ?? "Unable to register.", "error");
      return;
    }

    resetDraft();
    router.replace("/");
  };

  const handleSkip = () => {
    handleComplete([]);
  };

  return (
    <OnboardingBackground gender={draft.gender}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 pb-12 pt-6">
          <View className="flex flex-row justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-lg bg-white"
            >
              <Ionicons name="chevron-back" size={18} color="#5d5e5f" />
            </Pressable>
            <Pressable
              onPress={handleSkip}
              className="items-center rounded-2xl border border-white/20 bg-white py-2 px-4"
            >
              <Text className="text-base font-rubik-medium text-black-700">Skip</Text>
            </Pressable>
          </View>

          <Text className="mt-8 text-3xl font-rubik-bold text-black-800 text-center">
            What are you into?
          </Text>
          <Text className="mt-2 text-sm font-rubik text-black-600 text-center">
            Pick a few interests so others can discover you.
          </Text>

          <View className="mt-6 flex-row flex-wrap gap-3 justify-center items-center">
            {INTEREST_OPTIONS.map((item) => {
              const isSelected = selected.includes(item.value);
              return (
                <Pressable
                  key={item.value}
                  onPress={() => toggleInterest(item.value)}
                  className={`flex-row items-center gap-1 rounded-full border px-3 py-2 ${isSelected ? "border-white bg-white" : "border-white/60 bg-white/30"}`}
                >
                  <Text className="text-base">{item.emoji}</Text>
                  <Text className="text-base font-rubik-medium text-black-700">{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-auto gap-3">
            <Pressable
              onPress={() => handleComplete()}
              disabled={submitting}
              className={`items-center rounded-2xl py-4 ${submitting ? "bg-white/20" : "bg-white"
                }`}
            >
              {submitting ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text className="text-base font-rubik-semibold text-slate-900">
                  Complete
                </Text>
              )}
            </Pressable>

          </View>
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
