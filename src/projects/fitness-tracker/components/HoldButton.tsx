import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  label: string;
  color: string;
  trackColor: string;
  onComplete: () => void;
  holdMs?: number;
  size?: number;
};

/**
 * Anti-mistap Stop: a long-press that fills a ring. Releasing early resets
 * it. A plain tap never ends a workout.
 */
export function HoldButton({
  label,
  color,
  trackColor,
  onComplete,
  holdMs = 1200,
  size = 96,
}: Props) {
  const progress = useSharedValue(0);
  const stroke = 6;

  const ring = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(size / 2, size / 2, size / 2 - stroke / 2);
    return p;
  }, [size]);

  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const gesture = Gesture.LongPress()
    .minDuration(holdMs)
    .onBegin(() => {
      progress.value = withTiming(1, { duration: holdMs });
    })
    .onStart(() => {
      runOnJS(finish)();
    })
    .onFinalize(() => {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 150 });
    });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.wrap, { width: size, height: size }]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Press and hold to end the workout"
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Path
            path={ring}
            style="stroke"
            strokeWidth={stroke}
            color={trackColor}
          />
          <Path
            path={ring}
            style="stroke"
            strokeWidth={stroke}
            color={color}
            start={0}
            end={progress}
            strokeCap="round"
          />
        </Canvas>
        <View
          style={[
            styles.inner,
            {
              backgroundColor: color,
              width: size - 20,
              height: size - 20,
              borderRadius: size,
            },
          ]}
        >
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  inner: { alignItems: "center", justifyContent: "center" },
  label: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
});
