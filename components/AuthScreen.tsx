import React, { useState, useRef, useEffect } from "react";
import {
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Text,
    Animated,
    Keyboard,
    ImageBackground,
    Dimensions,
    Image,
} from "react-native";
import { useAnimatedStyle, withTiming } from "react-native-reanimated";
// import { Lock, Mail, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import images from "@/constants/images";

export default function AuthScreen() {
    const [activeTab, setActiveTab] = useState<"login" | "register">("register");
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        password: "",
    });

    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
            setIsKeyboardVisible(true);
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });

        const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
            setIsKeyboardVisible(false);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });

        return () => {
            keyboardDidShow.remove();
            keyboardDidHide.remove();
        };
    }, [slideAnim]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <SafeAreaView className='bg-white h-full'> 
            <ScrollView
                contentContainerClassName='h-full'
                bounces={false}
                scrollEnabled={isKeyboardVisible}
                keyboardShouldPersistTaps="handled"
            >

                {/* Background animated orbs placeholder */}
                <Image
                    source={images.login}
                    className='w-full h-4/6 '
                    resizeMode='contain'
                />

                {/* Main content container */}
                <Animated.View
                    style={{
                        transform: [{ translateY: slideAnim }],
                        width: "100%",
                        maxWidth: 420,
                    }}
                >
                    {/* Illustration area */}
                    <View className="items-center mb-8 h-44 justify-center">
                        <View className="items-center">
                            {/* Simplified character avatar */}
                            <View className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full items-center justify-center relative">
                                <Text className="text-3xl">👤</Text>

                                {/* Security badge */}
                                {/* <View className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg">
                    <Lock size={20} />
                  </View> */}
                            </View>
                        </View>
                    </View>

                    {/* Auth Card */}
                    <View className="bg-slate-900/50 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-md">
                        {/* Tabs */}
                        <View className="flex-row gap-3 mb-8 pb-4 border-b border-slate-600/30">
                            <TouchableOpacity
                                onPress={() => setActiveTab("login")}
                                className="pb-2 px-4 flex-1"
                            >
                                <Text
                                    className={`text-base font-semibold ${activeTab === "login"
                                        ? "text-white"
                                        : "text-slate-400"
                                        }`}
                                >
                                    Login
                                </Text>
                                {activeTab === "login" && (
                                    <View className="h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full mt-1" />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveTab("register")}
                                className="pb-2 px-4 flex-1"
                            >
                                <Text
                                    className={`text-base font-semibold ${activeTab === "register"
                                        ? "text-white"
                                        : "text-slate-400"
                                        }`}
                                >
                                    Register
                                </Text>
                                {activeTab === "register" && (
                                    <View className="h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full mt-1" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Welcome Message */}
                        <View className="mb-6">
                            <Text className="text-2xl font-bold text-white">
                                {activeTab === "register"
                                    ? "Get Started Free"
                                    : "Welcome Back"}
                            </Text>
                            <Text className="text-xs text-slate-400 mt-2">
                                {activeTab === "register"
                                    ? "Free forever. No Credit Card Needed"
                                    : "Sign in to your account"}
                            </Text>
                        </View>

                        {/* Form Fields */}
                        <View className="gap-3 mb-6">
                            {/* Email field */}
                            <View>
                                <Text className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                                    Email Address
                                </Text>
                                <View className="flex-row items-center bg-slate-800/40 border border-slate-600/40 rounded-lg px-3.5 py-2.5">
                                    {/* <Mail  size={18} /> */}
                                    <TextInput
                                        placeholder="your@email.com"
                                        placeholderTextColor="#64748b"
                                        value={formData.email}
                                        onChangeText={(value) =>
                                            handleInputChange("email", value)
                                        }
                                        keyboardType="email-address"
                                        className="flex-1 ml-2 text-slate-100 text-sm"
                                    />
                                </View>
                            </View>

                            {/* Name field - only for register */}
                            {activeTab === "register" && (
                                <View>
                                    <Text className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                                        Your Name
                                    </Text>
                                    <View className="flex-row items-center bg-slate-800/40 border border-slate-600/40 rounded-lg px-3.5 py-2.5">
                                        {/* <User  size={18} /> */}
                                        <TextInput
                                            placeholder="@yourname"
                                            placeholderTextColor="#64748b"
                                            value={formData.name}
                                            onChangeText={(value) =>
                                                handleInputChange("name", value)
                                            }
                                            className="flex-1 ml-2 text-slate-100 text-sm"
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Password field */}
                            <View>
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                                        Password
                                    </Text>
                                    {formData.password.length >= 8 && (
                                        <Text className="text-xs text-emerald-400 font-medium">
                                            Strong
                                        </Text>
                                    )}
                                </View>
                                <View className="flex-row items-center bg-slate-800/40 border border-slate-600/40 rounded-lg px-3.5 py-2.5">
                                    {/* <Lock size={18} /> */}
                                    <TextInput
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        value={formData.password}
                                        onChangeText={(value) =>
                                            handleInputChange("password", value)
                                        }
                                        secureTextEntry={true}
                                        className="flex-1 ml-2 text-slate-100 text-sm"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Submit button */}
                        <LinearGradient
                            colors={["#a855f7", "#ec4899"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ borderRadius: 8, marginBottom: 20 }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="py-3 px-4"
                            >
                                <Text className="text-white font-bold text-center">
                                    {activeTab === "register" ? "Sign up" : "Sign in"}
                                </Text>
                            </TouchableOpacity>
                        </LinearGradient>

                        {/* Divider */}
                        <View className="flex-row items-center mb-5 gap-3">
                            <View className="flex-1 h-px bg-slate-600/30" />
                            <Text className="text-xs text-slate-400 font-medium px-2">
                                Or sign up with
                            </Text>
                            <View className="flex-1 h-px bg-slate-600/30" />
                        </View>

                        {/* Social auth buttons */}
                        <View className="flex-row gap-3 justify-center">
                            <TouchableOpacity className="flex-1 py-2.5 bg-slate-700/40 border border-slate-600/40 rounded-lg items-center justify-center">
                                <Text className="text-2xl">🔵</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 py-2.5 bg-slate-700/40 border border-slate-600/40 rounded-lg items-center justify-center">
                                <Text className="text-2xl">🍎</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 py-2.5 bg-slate-700/40 border border-slate-600/40 rounded-lg items-center justify-center">
                                <Text className="text-2xl">✓</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer text */}
                    <Text className="text-xs text-slate-400 mt-6 text-center px-4">
                        By signing up, you agree to our Terms and Privacy Policy
                    </Text>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}
