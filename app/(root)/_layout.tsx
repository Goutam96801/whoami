import { useAuth } from "@/context/auth-context";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function AppLayout() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#e2e8f0" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/welcome" />;
  }

  return <Slot />;
}
