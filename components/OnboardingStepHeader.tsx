import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  step: number;
  total: number;
  onBack?: () => void;
};

const OnboardingStepHeader = ({ step, total, onBack }: Props) => {
  return (
    <View className="flex-row items-center justify-between">
      <Pressable
        onPress={onBack}
        className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
      >
        <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
      </Pressable>
      <View className="items-center">
        <View className="mt-2 flex-row items-center gap-2">
          {Array.from({ length: total }).map((_, index) => (
            <View
              key={`step-${index}`}
              className={`h-1.5 w-6 rounded-full ${
                index + 1 <= step ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </View>
      </View>
      <View className="h-10 w-10" />
    </View>
  );
};

export default OnboardingStepHeader;
