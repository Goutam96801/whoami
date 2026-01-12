import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmActionModal({
  visible,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = true,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <View className="flex-1 items-center justify-center bg-black/10 px-4">

        {/* Glass Container */}
        <BlurView
          intensity={60}
          tint="dark"
          className="w-full max-w-md rounded-2xl overflow-hidden"
        >
          <LinearGradient
            colors={["#5b3a5a", "#0f2633"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl"
          >
            <View className="rounded-2xl border border-white/20 bg-white/10 p-6">

              {/* Title */}
              <Text className="mb-2 text-2xl font-extrabold text-white">
                {title}
              </Text>

              {/* Description */}
              {description && (
                <Text className="mb-6 text-sm text-white/80">
                  {description}
                </Text>
              )}

              {/* Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-white/30 bg-white/20 py-3"
                >
                  <Text className="text-center text-base font-semibold text-white">
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={isLoading}
                  className={`flex-1 rounded-xl py-3 ${
                    destructive ? "bg-red-500/90" : "bg-amber-400"
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      className={`text-center text-base font-semibold ${
                        destructive ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
}
