import { useAuth } from "@/context/auth-context";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function AppLayout() {
  const { user } = useAuth();



  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return <Slot />;
}