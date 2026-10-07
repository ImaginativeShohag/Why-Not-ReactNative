import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Palette } from "@/src/projects/camera-social/constants/theme";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** Fires while dragging (drives the live preview). */
  onChange: (value: number) => void;
  /** Fires once on release (pushes one undo step). */
  onCommit: (value: number) => void;
};

const THUMB = 22;

/**
 * Bipolar slider (centre = neutral) built on a pan gesture so the thumb
 * tracks the finger on the UI thread; JS only hears about value changes.
 */
export function AdjustSlider({
  label,
  value,
  min = -1,
  max = 1,
  onChange,
  onCommit,
}: Props) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const dragging = useSharedValue(false);

  const toX = (v: number, w: number) => ((v - min) / (max - min)) * w;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width - THUMB;
    setWidth(w);
    trackWidth.set(w);
    x.set(toX(value, w));
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.set(true);
      x.set(Math.min(trackWidth.get(), Math.max(0, e.x - THUMB / 2)));
      const v = min + (x.get() / Math.max(1, trackWidth.get())) * (max - min);
      scheduleOnRN(onChange, v);
    })
    .onUpdate((e) => {
      x.set(Math.min(trackWidth.get(), Math.max(0, e.x - THUMB / 2)));
      const v = min + (x.get() / Math.max(1, trackWidth.get())) * (max - min);
      scheduleOnRN(onChange, v);
    })
    .onFinalize(() => {
      dragging.set(false);
      const v = min + (x.get() / Math.max(1, trackWidth.get())) * (max - min);
      scheduleOnRN(onCommit, v);
    });

  // Follow external value changes (undo/redo) when not dragging.
  const external = width > 0 ? toX(value, width) : 0;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragging.get() ? x.get() : external }],
  }));
  const zero = width > 0 ? toX(0, width) + THUMB / 2 : 0;
  const fillStyle = useAnimatedStyle(() => {
    const pos = (dragging.get() ? x.get() : external) + THUMB / 2;
    return { left: Math.min(pos, zero), width: Math.abs(pos - zero) };
  });

  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{Math.round(value * 100)}</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.hit}
          onLayout={onLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, paddingVertical: 4 },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: Palette.text, fontSize: 13, fontWeight: "600" },
  value: {
    color: Palette.textMuted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  hit: { height: 34, justifyContent: "center" },
  track: {
    position: "absolute",
    left: THUMB / 2,
    right: THUMB / 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.border,
  },
  fill: {
    position: "absolute",
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.accent,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#fff",
  },
});
