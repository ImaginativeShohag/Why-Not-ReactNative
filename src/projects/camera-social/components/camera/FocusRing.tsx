import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Palette } from "@/src/projects/camera-social/constants/theme";

const RING = 76;

export type FocusRingValues = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
};

/** Values + a UI-thread `show(x, y)` worklet for <FocusRing>. */
export function useFocusRing() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const show = (px: number, py: number) => {
    "worklet";
    x.set(px);
    y.set(py);
    scale.set(1.6);
    scale.set(withTiming(1, { duration: 260 }));
    opacity.set(
      withSequence(
        withTiming(1, { duration: 80 }),
        withDelay(900, withTiming(0, { duration: 300 })),
      ),
    );
  };

  return { values: { x, y, scale, opacity } satisfies FocusRingValues, show };
}

/** A ring that shrinks onto the tap point, then fades after ~1s. */
export function FocusRing({ values }: { values: FocusRingValues }) {
  const style = useAnimatedStyle(() => ({
    opacity: values.opacity.get(),
    transform: [
      { translateX: values.x.get() - RING / 2 },
      { translateY: values.y.get() - RING / 2 },
      { scale: values.scale.get() },
    ],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    left: 0,
    top: 0,
    width: RING,
    height: RING,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Palette.accent,
  },
});
