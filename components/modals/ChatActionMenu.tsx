import { Modal, Text, TouchableOpacity, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChatPreview } from "@/context/chat-context";

type Props = {
  visible: boolean;
  chat: ChatPreview | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onPin: () => void;
  onBlock: () => void;
  onDelete: () => void;
};

export default function ChatActionMenu({
  visible,
  chat,
  position,
  onClose,
  onPin,
  onBlock,
  onDelete,
}: Props) {
  if (!visible || !chat || !position) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      {/* Backdrop */}
      <Pressable onPress={onClose} className="flex-1 ">
        {/* Menu */}
        <View
          style={{
            position: "absolute",
            top: position.y - 20,
            left:  position.x === 0 ? 24 : position.x - 140,
          }}
        >
          <LinearGradient
            colors={["#5b3a5a", "#0f2633"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-48 rounded-xl overflow-hidden"
          >
            <View className="border border-white/15 bg-white/10 py-2">

              {/* Pin */}
              <ActionItem
                icon="pin"
                label={chat.isPinned ? "Unpin chat" : "Pin chat"}
                onPress={onPin}
                color="#fbbf24"
              />

              <Divider />

              {/* Block */}
              <ActionItem
                icon="ban"
                label={chat.isBlocked ? "Unblock user" : "Block user"}
                onPress={onBlock}
                color="#fb7185"
              />

              <Divider />

              {/* Delete */}
              <ActionItem
                icon="trash-outline"
                label="Delete chat"
                onPress={onDelete}
                color="#f87171"
                destructive
              />
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

/* ---------- Helpers ---------- */

function ActionItem({
  icon,
  label,
  onPress,
  color,
  destructive,
}: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text
        className={`font-rubik text-sm ${
          destructive ? "text-red-400" : "text-white"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-white/10 mx-2" />;
}
