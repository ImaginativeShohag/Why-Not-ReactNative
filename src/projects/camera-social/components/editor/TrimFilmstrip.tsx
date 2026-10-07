import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Palette } from "@/src/projects/camera-social/constants/theme";
import { formatDuration } from "@/src/projects/camera-social/utils/format";

type Props = {
  frames: string[];
  durationMs: number;
  startMs: number;
  endMs: number;
  positionMs: number;
  /** While dragging a handle — seek the player to show that frame. */
  onScrub: (ms: number) => void;
  onChange: (startMs: number, endMs: number) => void;
};

const HANDLE = 16;
const HEIGHT = 56;
const MIN_SPAN_MS = 1000;

/** Scrubbable filmstrip with in/out handles. */
export function TrimFilmstrip({
  frames,
  durationMs,
  startMs,
  endMs,
  positionMs,
  onScrub,
  onChange,
}: Props) {
  const [width, setWidth] = useState(0);
  const trackW = useSharedValue(0);
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const startLeft = useSharedValue(0);
  const startRight = useSharedValue(0);
  const [labels, setLabels] = useState({ start: startMs, end: endMs });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width - HANDLE * 2;
    setWidth(w);
    trackW.set(w);
    left.set((startMs / durationMs) * w);
    right.set((endMs / durationMs) * w);
  };

  const minSpan = MIN_SPAN_MS / Math.max(1, durationMs);

  const report = (l: number, r: number, scrubAt: number) => {
    const w = Math.max(1, width);
    const s = Math.round((l / w) * durationMs);
    const en = Math.round((r / w) * durationMs);
    setLabels({ start: s, end: en });
    onScrub(Math.round((scrubAt / w) * durationMs));
  };
  const commit = (l: number, r: number) => {
    const w = Math.max(1, width);
    onChange(
      Math.round((l / w) * durationMs),
      Math.round((r / w) * durationMs),
    );
  };

  const leftPan = Gesture.Pan()
    .onStart(() => {
      startLeft.set(left.get());
    })
    .onUpdate((e) => {
      const max = right.get() - minSpan * trackW.get();
      left.set(Math.min(max, Math.max(0, startLeft.get() + e.translationX)));
      scheduleOnRN(report, left.get(), right.get(), left.get());
    })
    .onEnd(() => {
      scheduleOnRN(commit, left.get(), right.get());
    });

  const rightPan = Gesture.Pan()
    .onStart(() => {
      startRight.set(right.get());
    })
    .onUpdate((e) => {
      const min = left.get() + minSpan * trackW.get();
      right.set(
        Math.max(
          min,
          Math.min(trackW.get(), startRight.get() + e.translationX),
        ),
      );
      scheduleOnRN(report, left.get(), right.get(), right.get());
    })
    .onEnd(() => {
      scheduleOnRN(commit, left.get(), right.get());
    });

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: left.get() }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: right.get() + HANDLE }],
  }));
  const selStyle = useAnimatedStyle(() => ({
    left: left.get() + HANDLE,
    width: right.get() - left.get(),
  }));
  const dimLeft = useAnimatedStyle(() => ({ width: left.get() + HANDLE }));
  const dimRight = useAnimatedStyle(() => ({
    left: right.get() + HANDLE,
    right: 0,
  }));

  const playheadX =
    width > 0 ? HANDLE + (positionMs / Math.max(1, durationMs)) * width : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.strip} onLayout={onLayout}>
        <View style={[styles.frames, { left: HANDLE, right: HANDLE }]}>
          {frames.map((uri, i) => (
            <Image
              key={`${i}-${uri}`}
              source={{ uri }}
              style={styles.frame}
              contentFit="cover"
            />
          ))}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[styles.dim, { left: 0 }, dimLeft]}
        />
        <Animated.View pointerEvents="none" style={[styles.dim, dimRight]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.selection, selStyle]}
        />
        {width > 0 ? (
          <View
            pointerEvents="none"
            style={[styles.playhead, { left: playheadX }]}
          />
        ) : null}
        <GestureDetector gesture={leftPan}>
          <Animated.View
            style={[styles.handle, styles.handleLeft, leftStyle]}
            hitSlop={12}
          >
            <View style={styles.grip} />
          </Animated.View>
        </GestureDetector>
        <GestureDetector gesture={rightPan}>
          <Animated.View
            style={[styles.handle, styles.handleRight, rightStyle]}
            hitSlop={12}
          >
            <View style={styles.grip} />
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatDuration(labels.start / 1000)}</Text>
        <Text style={styles.timeStrong}>
          {formatDuration((labels.end - labels.start) / 1000)} selected
        </Text>
        <Text style={styles.time}>{formatDuration(labels.end / 1000)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  strip: { height: HEIGHT, justifyContent: "center" },
  frames: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Palette.surfaceRaised,
  },
  frame: { flex: 1, height: "100%" },
  dim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  selection: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: Palette.accent,
  },
  playhead: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 2,
    marginLeft: -1,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
  handle: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: HANDLE,
    backgroundColor: Palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  handleLeft: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  handleRight: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  grip: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  time: {
    color: Palette.textMuted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  timeStrong: { color: Palette.text, fontSize: 12, fontWeight: "700" },
});
