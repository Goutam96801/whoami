
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/auth-context";
import { Image } from "react-native";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  const { user } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(26, 20, 35, 0.96)",
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          borderRadius: 0,
          position: "absolute",
        },
        tabBarActiveTintColor: "#fbbf24",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontFamily: "Rubik-Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ size, color }) =>
            user?.profilePhoto ? (
              <Image
                source={{ uri: user.profilePhoto }}
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                }}
              />
            ) : (
              <Ionicons name="person-circle" size={size} color={color} />
            ),
        }}
      />

    </Tabs>
  );
}
