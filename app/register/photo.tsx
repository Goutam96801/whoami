import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";
import OnboardingStepHeader from "@/components/OnboardingStepHeader";
import { useOnboarding } from "@/context/onboarding-context";
import { useToast } from "@/components/ToastProvider";

export default function RegisterPhoto() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handlePickImage = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast("Permission needed to pick a profile photo.", "warning");
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
      updateDraft({ profilePhoto: dataUri });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push("/register/interests");
  };

  const handleSkip = () => {
    updateDraft({ profilePhoto: "" });
    router.push("/register/interests");
  };

  console.log(draft.profilePhoto)

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
            Add a profile photo
          </Text>
          <Text className="mt-2 text-sm font-rubik text-black-600 text-center">
            Show your vibe to new people. You can skip this for now.
          </Text>

          <View className="mt-10 items-center">
            <View className="h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-dashed border-white">
              <Pressable
                onPress={handlePickImage}
                disabled={loading}
                className="h-full w-full items-center justify-center"
              >
                {draft.profilePhoto ? (
                  <Image
                    source={{ uri: draft.profilePhoto }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="camera" size={32} color="#5d5e5f" />
                )}

                {loading && (
                  <View className="absolute inset-0 items-center justify-center bg-black/40">
                    <ActivityIndicator color="#ffffff" />
                  </View>
                )}
              </Pressable>
            </View>

          </View>

          <View className="mt-auto gap-3">
            <Pressable
              onPress={handleContinue}
              className="items-center rounded-2xl bg-white py-4"
            >
              <Text className="text-base font-rubik-semibold text-slate-900">
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
