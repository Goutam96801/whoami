import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import OnboardingBackground from "@/components/OnboardingBackground";
import { useOnboarding } from "@/context/onboarding-context";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterBirthdate() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboarding();

  const [date, setDate] = useState<Date>(
    draft.dateOfBirth ? new Date(draft.dateOfBirth) : new Date(2010, 7, 7)
  );
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_: any, selectedDate?: Date) => {
    if (selectedDate) setDate(selectedDate);

    // Android should close immediately
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
  };

  const handleContinue = () => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    updateDraft({ dateOfBirth: `${yyyy}-${mm}-${dd}` });
    router.push("/register/photo");
  };

  return (
    <OnboardingBackground gender={draft.gender}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 pb-12 pt-6">

          {/* BACK */}
          <Pressable
            onPress={() => router.replace("/register/gender")}
            className="h-10 w-10 items-center justify-center rounded-lg bg-white"
          >
            <Ionicons name="chevron-back" size={18} color="#5d5e5f" />
          </Pressable>

          {/* TITLE */}
          <Text className="mt-8 text-3xl font-rubik-bold text-black-800 text-center">
            Your birthday
          </Text>

          <Text className="mt-2 text-sm font-rubik text-black-600 text-center">
            This way you and other people will be able to find each other by their age
          </Text>

          <View className="mt-10 mb-8 rounded-3xl bg-white px-4 shadow-lg">
            {!showPicker && (
              <Pressable
                onPress={() => setShowPicker(true)}
                className="flex-row items-center justify-between py-2"
              >
                <TextInput
                  value={date.toDateString()}
                  editable={false}
                  pointerEvents="none"
                  className="text-base font-rubik text-black flex-1"
                />
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </Pressable>
            )}

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date(2010, 1, 1)}
                minimumDate={new Date(1950, 1, 1)}
                onChange={handleChange}
                style={{ height: 180 }}
                textColor="#000"
              />
            )}
          </View>

          {/* CONTINUE */}
          <Pressable
            onPress={handleContinue}
            className="mt-12 items-center rounded-2xl bg-white py-4"
          >
            <Text className="text-base font-rubik-semibold text-slate-900">
              Continue
            </Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
