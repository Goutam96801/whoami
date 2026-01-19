import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import "./global.css";
import { AuthProvider } from "@/context/auth-context";
import { OnboardingProvider } from "@/context/onboarding-context";
import { ChatProvider } from "@/context/chat-context";
import { ToastProvider } from "@/components/ToastProvider";
import { initNotifications } from "@/lib/notifications";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    initNotifications();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <OnboardingProvider>
        <ToastProvider>
          <ChatProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ChatProvider>
        </ToastProvider>
      </OnboardingProvider>
    </AuthProvider>
  )
}
