import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import OnboardingBackground from "@/components/OnboardingBackground";
import { Gender, useOnboarding } from "@/context/onboarding-context";
import { Ionicons } from "@expo/vector-icons";



export default function RegisterGender() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboarding();
  const [error, setError] = useState<string | null>(null);

  const handleSelectGender = (gender: Gender) => {
    setError(null);
    updateDraft({ gender });
    router.push("/register/birthdate");
  };


  return (
    <OnboardingBackground gender={draft.gender}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 pb-12 pt-6">
          <Pressable
            onPress={() => router.replace("/register/credentials")}
            className="h-10 w-10 items-center justify-center rounded-lg bg-white"
          >
            <Ionicons name="chevron-back" size={18} color="#5d5e5f" />
          </Pressable>

          <Text className="mt-8 text-2xl font-rubik-bold text-black-800 text-center">
            How do you identify yourself?
          </Text>
          <Text className="mt-2 text-sm font-rubik text-black-600 text-center">
            This helps us set the right vibe and background.
          </Text>

          <View className="mt-8 gap-4 flex flex-col px-8">
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Pressable
                  className="py-4 bg-white rounded-2xl"
                  onPress={() => handleSelectGender("female")}
                >
                  <Text className="text-5xl text-center">👧</Text>
                  <Text className="text-center text-lg font-rubik-medium">
                    I'm female
                  </Text>
                </Pressable>
              </View>

              <View className="flex-1">
                <Pressable
                  className="py-4 bg-white rounded-2xl"
                  onPress={() => handleSelectGender("male")}
                >
                  <Text className="text-5xl text-center">👦</Text>
                  <Text className="text-center text-lg font-rubik-medium">
                    I'm male
                  </Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              className="px-8 py-4 bg-white rounded-2xl"
              onPress={() => handleSelectGender("other")}
            >
              <Text className="text-center text-lg font-rubik-medium">I'm non-binary</Text>
            </Pressable>
          </View>
          {error ? (
            <View className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3">
              <Text className="text-sm text-red-500 font-rubik">
                {error}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
