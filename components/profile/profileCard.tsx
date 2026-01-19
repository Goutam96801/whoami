import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { INTEREST_OPTIONS } from "@/constants/constant";
import { router } from "expo-router";

interface ProfileCardProps {
    id?:string;
    username: string;
    profilePhoto?: string | null;
    isOnline?: boolean;
    statusText?: string;
    age?: number | null;
    interests?: string[];
    onProfilePress?: () => void;
    onReportPress?: () => void;
}

const interestLookup = new Map(
    INTEREST_OPTIONS.map((option) => [option.value.toLowerCase(), option]),
);

const toTitle = (value: string) =>
    value
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^\w/, (char) => char.toUpperCase());

export const ProfileCard = ({
    id,
    username,
    profilePhoto,
    isOnline,
    statusText,
    age,
    interests,
    onProfilePress,
    onReportPress,
}: ProfileCardProps) => {
    const displayInterests = (interests ?? [])
        .map((interest) => {
            const key = interest.trim().toLowerCase();
            const option = interestLookup.get(key);
            return {
                label: option?.label ?? toTitle(interest),
                emoji: option?.emoji,
            };
        })
        .filter((item) => item.label.length > 0)
        .slice(0, 6);

    return (
        <View className="items-center justify-center px-6">
            <View className="relative w-full max-w-[320px] rounded-[28px] bg-white/90 px-6 py-6 shadow-lg">
                <View className="items-center">
                    <View className="absolute bottom-12">
                        <View className="relative">
                            <View className="h-20 w-20 overflow-hidden">
                                {profilePhoto ? (
                                    <Image source={{ uri: profilePhoto }} className="h-full w-full" />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <Ionicons name="person" size={36} color="#94a3b8" />
                                    </View>
                                )}
                            </View>
                            {isOnline ? (
                                <View className="absolute -left-0.5 -top-0.5 h-3 w-3 rounded-full bg-green-500" />
                            ) : null}
                        </View>
                    </View>


                    <View>
                        <Text className="text-base font-rubik-semibold text-slate-900">
                            {username}
                            {typeof age === "number" ? `, ${age} yo` : ""}
                        </Text>
                    </View>

                    {statusText ? (
                        <Text
                            className={`text-xs font-rubik ${isOnline ? "text-green-500" : "text-slate-500"
                                }`}
                        >
                            {statusText}
                        </Text>
                    ) : null}
                </View>

                {displayInterests.length ? (
                    <View className="mt-4 flex-row flex-wrap justify-center gap-3">
                        {displayInterests.map((interest) => (
                            <View
                                key={`${interest.label}-${interest.emoji ?? "text"}`}
                                className="flex-row items-center gap-1 py-1.5"
                            >
                                {interest.emoji ? (
                                    <Text className="text-sm">{interest.emoji}</Text>
                                ) : null}
                                <Text className="text-xs font-rubik-medium text-slate-700">
                                    {interest.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-100/60 px-4 py-3">
                        <Text className="text-center text-xs font-rubik text-slate-500">
                            Start the conversation by saying hello.
                        </Text>
                    </View>
                )}

                <View className="mt-5 flex-row items-center justify-center gap-6">
                    {
                        onProfilePress ? (
                            <Pressable
                                onPress={onProfilePress}
                                disabled={!onProfilePress}
                                className="items-center"
                            >
                                <View className="h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                                    <Ionicons name="person" size={18} color="#64748b" />
                                </View>
                                <Text className="mt-1 text-[10px] font-rubik text-slate-500">
                                    Profile
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={() => {
                                    if (!id) {
                                        return;
                                    }
                                    router.push({ pathname: "/chat/[id]", params: { id: id } });
                                }}
                                disabled={!id}
                                className="items-center"
                            >
                                <View className="h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                                    <Ionicons name="chatbox" size={18} color="#64748b" />
                                </View>
                                <Text className="mt-1 text-[10px] font-rubik text-slate-500">
                                    Message
                                </Text>
                            </Pressable>
                        )

                    }
                    <Pressable
                        onPress={onReportPress}
                        disabled={!onReportPress}
                        className="items-center"
                    >
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                            <Ionicons name="flag" size={18} color="#64748b" />
                        </View>
                        <Text className="mt-1 text-[10px] font-rubik text-slate-500">
                            Report
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

export default ProfileCard;
