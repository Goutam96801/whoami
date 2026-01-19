import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import OnboardingBackground from "@/components/OnboardingBackground";
import OnboardingStepHeader from "@/components/OnboardingStepHeader";
import { useOnboarding } from "@/context/onboarding-context";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterCredentials() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboarding();
  const [username, setUsername] = useState(draft.username);
  const [password, setPassword] = useState(draft.password);
  const [confirmPassword, setConfirmPassword] = useState(draft.confirmPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    updateDraft({
      username: trimmedUsername,
      password,
      confirmPassword,
    });
    router.push("/register/gender");
  };

  return (
    <OnboardingBackground gender={draft.gender}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-between px-6 pb-12 pt-6">
            <View>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => router.replace("/welcome")}
                  className="h-10 w-10 items-center justify-center rounded-lg bg-white"
                >
                  <Ionicons name="chevron-back" size={18} color="#5d5e5f" />
                </Pressable>
              </View>

              <Text className="mt-8 text-3xl font-rubik-bold text-black-800">
                Create your account
              </Text>
              <Text className="mt-2 text-sm font-rubik text-black-600">
                Start with a username and password you will remember.
              </Text>

              <View className="mt-8 gap-4">
                <View>
                  <Text className="mb-2 text-xs uppercase tracking-widest text-black-700 font-rubik-medium">
                    Username
                  </Text>
                  <TextInput
                    value={username}
                    onChangeText={(value) => {
                      setUsername(value);
                      setError(null);
                    }}
                    placeholder="username"
                    placeholderTextColor="#EB7CCF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectionColor="#EB7CCF"
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-black-800 font-rubik"
                  />
                </View>

                <View>
                  <Text className="mb-2 text-xs uppercase tracking-widest text-black-700 font-rubik-medium">
                    Password
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setError(null);
                      }}
                      placeholder="password"
                      placeholderTextColor="#EB7CCF"
                      autoCapitalize="none"
                      secureTextEntry={!showPassword}
                      selectionColor="#EB7CCF"
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-black-800 font-rubik"
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <Text className="text-base font-rubik-medium text-slate-200">
                        {showPassword ? "👁️" : "🙈"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text className="mb-2 text-xs uppercase tracking-widest text-black-700 font-rubik-medium">
                    Confirm password
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setError(null);
                    }}
                    placeholder="confirm password"
                    placeholderTextColor="#EB7CCF"
                    autoCapitalize="none"
                    secureTextEntry
                    selectionColor="#EB7CCF"
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-black-800 font-rubik"

                  />
                </View>
              </View>

              {error ? (
                <View className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3">
                  <Text className="text-sm text-red-500 font-rubik">
                    {error}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleNext}
                className="mt-10 items-center rounded-2xl bg-white py-4"
              >
                <Text className="text-base font-rubik-semibold text-slate-900">
                  Continue
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
