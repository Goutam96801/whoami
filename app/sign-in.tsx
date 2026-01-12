import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DropDownPicker from "react-native-dropdown-picker";
import { Redirect, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useAuth } from "@/context/auth-context";
import images from "@/constants/images";

type Mode = "login" | "register";
type Gender = "male" | "female" | "other";

const genderOptions: Array<{ label: string; value: Gender }> = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
];

export default function SignIn() {
    const router = useRouter();
    const { signIn, signUp, user } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [gender, setGender] = useState<Gender>("male");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [genderOpen, setGenderOpen] = useState(false);
    const [genderItems, setGenderItems] = useState(genderOptions);
    const [showPassword, setShowPassword] = useState(false);


    if (user) return <Redirect href="/" />
    const handleModeChange = (nextMode: Mode) => {
        setMode(nextMode);
        setError(null);
        setPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async () => {
        console.log("Starting auth")
        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
            setError("Username and password are required.");
            return;
        }

        if (mode === "register" && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        setError(null);

        if (mode === "login") {
            console.log("mode: login")
            const result = await signIn(trimmedUsername, password);
            console.log(result)
            if (!result.ok) {
                setError(result.error);
            } else {

                router.replace("/");
            }
            setSubmitting(false);
            return;
        }

        const registerResult = await signUp({
            username: trimmedUsername,
            password,
            confirmPassword,
            gender,
        });

        if (!registerResult.ok) {
            setError(registerResult.error);
            setSubmitting(false);
            return;
        }

        router.replace("/");
        setSubmitting(false);
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                <Image
                    source={images.bkg}
                    style={styles.backgroundImage}
                    resizeMode="contain"
                />
                <Image
                    source={images.abstract}
                    style={styles.abstract}
                    resizeMode="contain"
                />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <BlurView intensity={25} tint="dark" className="rounded-lg border border-zinc-950" >
                        <View style={styles.glassInner}>
                            <Text
                                className="text-3xl text-white"
                                style={{ fontFamily: "Rubik-SemiBold" }}
                            >
                                {mode === "login" ? "Welcome back" : "Create your account"}
                            </Text>
                            <Text
                                className="mt-3 text-sm text-slate-300"
                                style={{ fontFamily: "Rubik-Regular" }}
                            >
                                {mode === "login"
                                    ? "Sign in to jump back into your conversations."
                                    : "Join the space and start chatting right away."}
                            </Text>

                            <View className="mt-6 flex-row rounded-full border border-white/10 bg-white/10 p-1">
                                <Pressable
                                    onPress={() => handleModeChange("login")}
                                    className={`flex-1 items-center rounded-full py-2 ${mode === "login" ? "bg-white/20" : ""
                                        }`}
                                >
                                    <Text
                                        className={mode === "login" ? "text-white" : "text-slate-300"}
                                        style={{ fontFamily: "Rubik-Medium" }}
                                    >
                                        Sign in
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleModeChange("register")}
                                    className={`flex-1 items-center rounded-full py-2 ${mode === "register" ? "bg-white/20" : ""
                                        }`}
                                >
                                    <Text
                                        className={
                                            mode === "register" ? "text-white" : "text-slate-300"
                                        }
                                        style={{ fontFamily: "Rubik-Medium" }}
                                    >
                                        Register
                                    </Text>
                                </Pressable>
                            </View>

                            <View className="mt-6 gap-4">
                                <View>
                                    <Text
                                        className="mb-2 text-xs uppercase tracking-widest text-slate-400"
                                        style={{ fontFamily: "Rubik-Medium" }}
                                    >
                                        Username
                                    </Text>
                                    <TextInput
                                        value={username}
                                        onChangeText={setUsername}
                                        placeholder="username"
                                        placeholderTextColor="#94a3b8"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        selectionColor="#fbbf24"
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-100"
                                        style={{ fontFamily: "Rubik-Regular" }}
                                    />
                                </View>
                                <View>
                                    <Text
                                        className="mb-2 text-xs uppercase tracking-widest text-slate-400"
                                        style={{ fontFamily: "Rubik-Medium" }}
                                    >
                                        Password
                                    </Text>

                                    <View className="relative">
                                        <TextInput
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="••••••••"
                                            placeholderTextColor="#94a3b8"
                                            autoCapitalize="none"
                                            secureTextEntry={!showPassword}
                                            selectionColor="#fbbf24"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-base text-slate-100"
                                            style={{ fontFamily: "Rubik-Regular" }}
                                        />

                                        <Pressable
                                            onPress={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2"
                                        >
                                            <Text className="text-slate-300 text-sm">
                                                {showPassword ? "🙈" : "👁️"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                                {mode === "register" ? (
                                    <View>
                                        <Text
                                            className="mb-2 text-xs uppercase tracking-widest text-slate-400"
                                            style={{ fontFamily: "Rubik-Medium" }}
                                        >
                                            Confirm password
                                        </Text>
                                        <TextInput
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            placeholder="••••••••"
                                            placeholderTextColor="#94a3b8"
                                            autoCapitalize="none"
                                            secureTextEntry
                                            selectionColor="#fbbf24"
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-100"
                                            style={{ fontFamily: "Rubik-Regular" }}
                                        />
                                    </View>
                                ) : null}
                            </View>

                            {mode === "register" && (
                                <View className="mt-6" style={{ zIndex: 1000 }}>
                                    <Text
                                        className="mb-2 text-xs uppercase tracking-widest text-slate-400"
                                        style={{ fontFamily: "Rubik-Medium" }}
                                    >
                                        Gender
                                    </Text>

                                    <DropDownPicker
                                        open={genderOpen}
                                        value={gender}
                                        items={genderItems}

                                        setOpen={setGenderOpen}
                                        setValue={setGender}
                                        setItems={setGenderItems}

                                        placeholder="Select gender"
                                        listMode="SCROLLVIEW"
                                        closeAfterSelecting={true}

                                        style={{
                                            height: 52,
                                            borderRadius: 16,
                                            borderColor: "rgba(255,255,255,0.1)",
                                            backgroundColor: "rgba(255,255,255,0.05)",
                                        }}

                                        dropDownContainerStyle={{
                                            borderRadius: 16,
                                            borderColor: "rgba(255,255,255,0.1)",
                                            backgroundColor: "rgba(0,0,0,0.9)",
                                        }}

                                        textStyle={{
                                            color: "#e5e7eb",
                                            fontFamily: "Rubik-Regular",
                                            fontSize: 16,
                                        }}

                                        listItemLabelStyle={{
                                            color: "#e5e7eb",
                                            fontFamily: "Rubik-Regular",
                                        }}

                                        placeholderStyle={{
                                            color: "#94a3b8",
                                            fontFamily: "Rubik-Regular",
                                        }}

                                        selectedItemContainerStyle={{
                                            backgroundColor: "rgba(255,255,255,0.08)",
                                        }}
                                    />
                                </View>
                            )}



                            {error ? (
                                <View className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                                    <Text
                                        className="text-sm text-rose-200"
                                        style={{ fontFamily: "Rubik-Regular" }}
                                    >
                                        {error}
                                    </Text>
                                </View>
                            ) : null}

                            <Pressable
                                onPress={handleSubmit}
                                disabled={submitting}
                                className={`mt-7 items-center rounded-2xl py-4 ${submitting ? "bg-black/10" : "bg-black/50 "
                                    }`}
                            >
                                <Text
                                    className={`text-base font-rubik-semibold ${submitting ? "text-white/50" : "text-white "
                                        }`}
                                >
                                    {submitting
                                        ? "Loading..."
                                        : "Let's go"}
                                </Text>
                            </Pressable>

                            <Text
                                className="mt-6 text-center text-xs text-slate-400"
                                style={{ fontFamily: "Rubik-Regular" }}
                            >
                                By continuing you agree to keep conversations respectful.
                            </Text>
                        </View>
                    </BlurView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(2, 6, 23, 0.78)",
    },
    abstract: {
        position: "absolute",
        right: -120,
        top: -50,
        width: 360,
        height: 360,
        opacity: 0.75,
        transform: [{ rotate: "-18deg" }],
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 48,
        paddingTop: 24,
        justifyContent: "center",
    },

    glassCard: {
        borderRadius: 28,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.14)",
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
    },
    glassInner: {
        padding: 24,
    },
    ctaShadow: {
        shadowColor: "#fbbf24",
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
});
