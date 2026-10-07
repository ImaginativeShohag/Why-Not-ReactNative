import type { ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type Props = {
  children: ReactNode;
  /** Off while zoomed in — the drag belongs to the image then. */
  enabled: boolean;
  onDismiss: () => void;
  backdropColor?: string;
};

const DISMISS_DISTANCE = 140;
const DISMISS_VELOCITY = 900;

/**
 * Swipe-down-to-dismiss with the backdrop opacity tracking the drag. The pan
 * only activates on a clear downward move and fails on horizontal ones, so
 * the pager keeps its swipes.
 */
export function DismissibleContainer({
  children,
  enabled,
  onDismiss,
  backdropColor = "#000",
}: Props) {
  const { height } = useWindowDimensions();
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);

  const dismiss = () => onDismiss();

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY(14)
    .failOffsetX([-18, 18])
    .onUpdate((e) => {
      ty.set(Math.max(0, e.translationY));
      tx.set(e.translationX * 0.5);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        ty.set(
          withTiming(height, { duration: 180 }, (finished) => {
            if (finished) scheduleOnRN(dismiss);
          }),
        );
        return;
      }
      ty.set(withSpring(0, { damping: 18, stiffness: 200 }));
      tx.set(withSpring(0, { damping: 18, stiffness: 200 }));
    });

  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(
      ty.get(),
      [0, height * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const content = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      {
        scale: interpolate(
          ty.get(),
          [0, height],
          [1, 0.7],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.fill}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: backdropColor },
          backdrop,
        ]}
      />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.fill, content]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
