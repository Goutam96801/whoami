import { Text, View, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "warning" | "info";

type ToastProps = {
  message: string;
  type?: ToastType;
  onHide: () => void;
};

const CONFIG = {
  success: { icon: "checkmark-circle", color: "#22c55e" },
  error: { icon: "close-circle", color: "#ef4444" },
  warning: { icon: "warning", color: "#facc15" },
  info: { icon: "information-circle", color: "#38bdf8" },
};

export default function Toast({ message, type = "info", onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(onHide);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const config = CONFIG[type];

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
      className="mb-2 flex-row items-center gap-3 rounded-xl border border-white/10 bg-[#15171c]/95 px-4 py-3"
    >
      <Ionicons name={config.icon as any} size={18} color={config.color} />
      <Text className="flex-1 text-sm font-rubik text-white">
        {message}
      </Text>
    </Animated.View>
  );
}
