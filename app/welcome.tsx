import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import OnboardingBackground from "@/components/OnboardingBackground";
import icons from "@/constants/icons";

export default function Welcome() {
  const router = useRouter();

  return (
    <OnboardingBackground>
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-between px-4 pt-6 mb-6">
          <View className="flex flex-col gap-8 justify-center">
            <View className="flex flex-row justify-evenly px-6">
              <Text className="text-5xl">😎</Text>
              <Text className="text-5xl">🥰</Text>
            </View>
            <View className="flex flex-row justify-between px-8">
              <Text className="text-5xl">🙇</Text>
              <Text className="text-5xl absolute left-1/2 -top-10">🌶️</Text>
              <Text className="text-5xl">💦</Text>
            </View>
            <View className="flex flex-row justify-evenly">
              <Text className="text-5xl">👀</Text>
              <Text className="text-5xl">👅</Text>
            </View>
            <View className="flex flex-row justify-between px-8">
              <Text className="text-5xl">🔥</Text>
              <Text className="text-5xl absolute left-1/2 -top-10">🙈</Text>
              <Text className="text-5xl">💌</Text>
            </View>
            <View className="flex items-center px-8">
              <Image
                source={icons.appIcon}
                alt="appIcon"
                style={{width:150, height:150}}
              />
              <Text className="mt-6 text-4xl font-rubik-semibold ">
                Anonymous chats
              </Text>
              <Text className="mt-3 text-lg font-rubik text-center px-3">
                Meet new people through low pressure conversations and see where the
                spark takes you.
              </Text>
            </View>

          </View>
          <View className="gap-3">
            <Pressable
              onPress={() => router.replace("/sign-in")}
              className="items-center rounded-2xl bg-white py-4"
            >
              <Text className="text-base font-rubik-semibold text-slate-900">
                Already have an account ? Sign in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/register/credentials")}
              className="items-center rounded-2xl border border-white/60 py-4"
            >
              <Text className="text-base font-rubik-semibold text-white">
                Don't have an account? Create one
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}
