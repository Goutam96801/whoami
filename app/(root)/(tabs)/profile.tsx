import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import icons from "@/constants/icons";
import { useAuth } from "@/context/auth-context";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";
import { useToast } from "@/components/ToastProvider";
import { router } from "expo-router";

interface SettingsItemProp {
  icon: ImageSourcePropType;
  title: string;
  onPress?: () => void;
  textStyle?: string;
  iconTint?: string;
  showArrow?: boolean;
}

const SettingsItem = ({
  icon,
  title,
  onPress,
  textStyle,
  iconTint,
  showArrow = true,
}: SettingsItemProp) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-row items-center justify-between py-3"
  >
    <View className="flex flex-row items-center gap-3">
      <Image
        source={icon}
        className="size-6"
        style={{ tintColor: iconTint ?? "#e2e8f0" }}
      />
      <Text
        className={`text-base font-rubik-medium text-slate-200 ${textStyle ?? ""}`}
      >
        {title}
      </Text>
    </View>

    {showArrow && (
      <Image
        source={icons.rightArrow}
        className="size-5"
        style={{ tintColor: "#94a3b8" }}
      />
    )}
  </TouchableOpacity>
);

const Profile = () => {
  const { user, signOut, updateProfile, uploadProfilePhoto, deleteAccount } =
    useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setUsername(user?.username ?? "");
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    showToast("Logged out successfully", "success");
  };

  const handleEditToggle = () => {
    if (editing) {
      setUsername(user?.username ?? "");
      setEditing(false);
      return;
    }
    setUsername(user?.username ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      showToast("Username is required.", "error")
      return;
    }

    const payload: { username?: string } = {};
    if (trimmedUsername !== user?.username) {
      payload.username = trimmedUsername;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const result = await updateProfile(payload);
    setSaving(false);

    if (result.ok) {
      setEditing(false);
      showToast("Profile updated successfully.", "success");
    } else {
      showToast(result.error ?? "Something went wrong.", "error");
    }
  };

  const handleCancel = () => {
    setUsername(user?.username ?? "");
    setEditing(false);
  };

  const handlePickImage = async () => {
    if (uploading) {
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Permission needed. Allow access to pick a profile photo.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }
    const asset = result.assets[0];
    if (!asset.base64) {
      showToast("Unable to read the selected image.", "error");
      return;
    }

    const mimeType = asset.mimeType ?? "image/jpeg";
    const dataUri = `data:${mimeType};base64,${asset.base64}`;

    setUploading(true);
    const uploadResult = await uploadProfilePhoto(dataUri);
    setUploading(false);

    if (uploadResult.ok) {
      showToast("Profile photo updated.", "success");
    } else {
      showToast(uploadResult.error ?? "Something went wrong.", "error");
    }
  };

  return (
    <LinearGradient
      colors={["#5b3a5a", "#0f2633"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-32 pt-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-rubik-bold text-white">Profile</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handleEditToggle}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10"
              >
                <Ionicons
                  name={editing ? "close" : "create-outline"}
                  size={18}
                  color="#e2e8f0"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-10 items-center">
            <TouchableOpacity
              disabled={!editing || uploading}
              onPress={editing ? handlePickImage : undefined}
              className="h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10"
            >
              {user?.profilePhoto ? (
                <Image
                  source={{ uri: user.profilePhoto }}
                  className="h-full w-full"
                />
              ) : (
                <Ionicons name="person" size={42} color="#cbd5f5" />
              )}
              {editing ? (
                <View className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-amber-400">
                  {uploading ? (
                    <ActivityIndicator color="#0f172a" size="small" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#0f172a" />
                  )}
                </View>
              ) : (
                <View className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border border-[#0f2633] bg-emerald-400" />
              )}
            </TouchableOpacity>
            <Text className="mt-4 text-2xl font-rubik-bold text-white">
              {user?.username ?? "Guest"}
            </Text>
            <Text className="mt-1 text-xs font-rubik text-slate-400">
              Active now
            </Text>
          </View>

          <View className="mt-8 rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
            <Text className="text-xs font-rubik-medium text-slate-400 uppercase">
              Profile details
            </Text>
            <View className="mt-4">
              <Text className="text-xs font-rubik text-slate-400">Username</Text>
              {editing ? (
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#94a3b8"
                  className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-rubik text-white"
                />
              ) : (
                <Text className="mt-2 text-base font-rubik text-white">
                  {user?.username ?? "Guest"}
                </Text>
              )}
            </View>
            {editing && (
              <View className="mt-5 flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className="flex-1 items-center rounded-2xl bg-amber-400 px-4 py-3"
                >
                  {saving ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text className="text-sm font-rubik-semibold text-slate-900">
                      Save changes
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancel}
                  className="flex-1 items-center rounded-2xl border border-white/10 px-4 py-3"
                >
                  <Text className="text-sm font-rubik text-slate-200">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="mt-8 rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
            <Text className="text-xs font-rubik-medium text-slate-400 uppercase">
              Account
            </Text>
            <View className="mt-3">
              <SettingsItem
                icon={icons.logout}
                title="Logout"
                textStyle="text-rose-400"
                iconTint="#f87171"
                showArrow={false}
                onPress={handleLogout}
              />
              <TouchableOpacity
                onPress={() => setShowDeleteModal(true)}
                className="flex flex-row items-center justify-between py-3"
              >
                <View className="flex flex-row items-center gap-3">
                  <Ionicons name="trash-outline" size={20} color="#f87171" />
                  <Text className="text-base font-rubik-medium text-rose-400">
                    Delete account
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <ConfirmActionModal
            visible={showDeleteModal}
            title="Delete account"
            description="This will permanently delete your account and all associated data. This action cannot be undone."
            confirmText="Delete account"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              if (!user) {
                showToast("Authentication error", "error");
                return;
              }

              const response = await deleteAccount();
              if (!response?.ok) {
                showToast("Failed to delete account", "error");
                return;
              }

              await signOut();
              showToast("Account deleted successfully", "success");
              router.replace("/sign-in");
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Profile;
