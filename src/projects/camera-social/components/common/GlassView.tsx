import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

/**
 * Translucent chrome that floats over media. Android only blurs with the
 * (opt-in) Dimezis method; without it BlurView is a flat tint.
 */
export function GlassView({ children, style, intensity = 40 }: Props) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      blurMethod={
        Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : "none"
      }
      style={[styles.glass, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: { overflow: "hidden", backgroundColor: "rgba(20,20,22,0.35)" },
});
