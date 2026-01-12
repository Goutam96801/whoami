import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import "./global.css";
import { AuthProvider } from "@/context/auth-context";
import { ChatProvider } from "@/context/chat-context";
import { ToastProvider } from "@/components/ToastProvider";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ToastProvider>
        <ChatProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ChatProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
