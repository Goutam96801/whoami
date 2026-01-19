import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import images from "@/constants/images";
import type { Gender } from "@/context/onboarding-context";

const getBackgroundImage = (gender?: Gender | null) => {
  if (gender === "female") {
    return images.chatWithFemaleBkg;
  }
  if (gender === "male") {
    return images.chatWithMaleBkg;
  }
  return images.defaultBkg;
};

const OnboardingBackground = ({
  gender,
  children,
}: {
  gender?: Gender | null;
  children: ReactNode;
}) => {
  return (
    <View style={styles.container}>
      <Image
        source={getBackgroundImage(gender)}
        resizeMode="cover"
        style={styles.background}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    height:"100%",
    width:"100%"
  },
});

export default OnboardingBackground;
