import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Shutter feedback chain values. `flash()` is a worklet (runs at touch-down on
 * the UI thread); `fly()` is kicked from JS once the sensor returns a frame,
 * but the animation itself runs entirely on the UI thread.
 */
export function useShutterFeedback() {
  const flashOpacity = useSharedValue(0);
  const flyProgress = useSharedValue(0);
  const flyVisible = useSharedValue(0);
  const bump = useSharedValue(1);

  const flash = () => {
    "worklet";
    flashOpacity.set(
      withSequence(
        withTiming(0.9, { duration: 30 }),
        withTiming(0, { duration: 150 }),
      ),
    );
  };

  const fly = () => {
    flyProgress.set(0);
    flyVisible.set(1);
    flyProgress.set(
      withTiming(1, { duration: 420 }, (finished) => {
        if (finished) {
          flyVisible.set(withTiming(0, { duration: 80 }));
          bump.set(
            withSequence(withTiming(1.15, { duration: 90 }), withSpring(1)),
          );
        }
      }),
    );
  };

  return { flashOpacity, flyProgress, flyVisible, bump, flash, fly };
}

export function FlashOverlay({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.flash, style]}
    />
  );
}

type FlyProps = {
  uri: string | null;
  progress: SharedValue<number>;
  visible: SharedValue<number>;
  from: Rect;
  to: Rect;
};

/** The captured frame scaling down and flying into the last-shot button. */
export function FlyingThumbnail({
  uri,
  progress,
  visible,
  from,
  to,
}: FlyProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: visible.get(),
      left: interpolate(p, [0, 1], [from.x, to.x]),
      top: interpolate(p, [0, 1], [from.y, to.y]),
      width: interpolate(p, [0, 1], [from.width, to.width]),
      height: interpolate(p, [0, 1], [from.height, to.height]),
      borderRadius: interpolate(p, [0, 1], [4, 10]),
    };
  });
  if (!uri) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.fly, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flash: { backgroundColor: "#fff" },
  fly: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
