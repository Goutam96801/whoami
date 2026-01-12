import images from "@/constants/images";
import { ReactNode } from "react";
import { ImageBackground, View } from "react-native";

export const AppBackground = ({ children }: { children: ReactNode }) => {

  return (
    <ImageBackground
      source={images.main}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </ImageBackground>
  );
};
