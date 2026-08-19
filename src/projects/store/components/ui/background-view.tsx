import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type BackgroundViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Decorative gradient background used behind the Store branding.
 * Dumb + reusable: it only renders whatever children it is given.
 */
export default function BackgroundView({
  style,
  children,
}: BackgroundViewProps) {
  return (
    <LinearGradient
      colors={["purple", "blue"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      <View style={styles.overlay} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,0,0,0.15)", // simple mesh-like overlay
  },
});
