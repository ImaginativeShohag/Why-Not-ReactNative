import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { Chapter } from "@/src/projects/podcast-player/models/Episode";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import {
  formatDuration,
  formatRemaining,
} from "@/src/projects/podcast-player/utils/format";

type Props = {
  position: number;
  duration: number;
  chapters: Chapter[];
  accent: string;
  onSeek: (seconds: number) => void;
};

const TRACK_HEIGHT = 4;
const TICK_SNAP_PX = 14;

/**
 * Scrubber with a seek-lock: while the finger is down (and briefly after
 * release, until the player reports the new position) the UI owns the
 * position, so 500 ms status ticks can't yank the thumb back. Chapter starts
 * render as ticks; tapping near one seeks exactly to it.
 */
export function Scrubber({
  position,
  duration,
  chapters,
  accent,
  onSeek,
}: Props) {
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [settling, setSettling] = useState<number | null>(null);

  // Release the lock once the player catches up (or after 1.5 s regardless).
  useEffect(() => {
    if (settling == null) return;
    const timer = setTimeout(() => setSettling(null), 1500);
    return () => clearTimeout(timer);
  }, [settling]);
  if (settling != null && Math.abs(position - settling) < 1.5) {
    setSettling(null);
  }

  const shown = scrub ?? settling ?? position;
  const fraction =
    duration > 0 ? Math.max(0, Math.min(1, shown / duration)) : 0;

  const secondsAt = (x: number) =>
    duration > 0 && width > 0
      ? Math.max(0, Math.min(1, x / width)) * duration
      : 0;

  const commit = (seconds: number) => {
    setScrub(null);
    setSettling(seconds);
    onSeek(seconds);
  };

  const tapAt = (x: number) => {
    if (duration <= 0 || width <= 0) return;
    const near = chapters.find(
      (c) => Math.abs((c.start / duration) * width - x) <= TICK_SNAP_PX,
    );
    commit(near ? near.start : secondsAt(x));
  };

  // runOnJS(true): the callbacks drive React state (labels + seek), so they
  // run on the JS thread rather than as UI-thread worklets.
  const pan = Gesture.Pan()
    .minDistance(2)
    .hitSlop({ top: 20, bottom: 20 })
    .onStart((e) => {
      setScrub(secondsAt(e.x));
    })
    .onUpdate((e) => {
      setScrub(secondsAt(e.x));
    })
    .onEnd((e) => {
      commit(secondsAt(e.x));
    })
    .onFinalize((_e, success) => {
      if (!success) setScrub(null);
    })
    .runOnJS(true);

  const tap = Gesture.Tap()
    .hitSlop({ top: 20, bottom: 20 })
    .onEnd((e) => {
      tapAt(e.x);
    })
    .runOnJS(true);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Playback position"
      accessibilityValue={{
        text: `${formatDuration(shown)} of ${formatDuration(duration)}`,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        onSeek(
          Math.max(
            0,
            shown + (e.nativeEvent.actionName === "increment" ? 30 : -30),
          ),
        )
      }
    >
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View style={styles.hit} onLayout={onLayout}>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${fraction * 100}%`, backgroundColor: accent },
              ]}
            />
          </View>
          {duration > 0
            ? chapters.map((c, i) =>
                c.start > 0 ? (
                  <View
                    key={`${c.start}-${i}`}
                    pointerEvents="none"
                    style={[
                      styles.tick,
                      { left: `${(c.start / duration) * 100}%` },
                    ]}
                  />
                ) : null,
              )
            : null}
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                left: `${fraction * 100}%`,
                backgroundColor: accent,
                transform: [
                  { translateX: -(scrub != null ? 11 : 7) },
                  { scale: 1 },
                ],
                width: scrub != null ? 22 : 14,
                height: scrub != null ? 22 : 14,
                borderRadius: 11,
              },
            ]}
          />
        </View>
      </GestureDetector>
      <View style={styles.labels}>
        <Text style={styles.time}>{formatDuration(shown)}</Text>
        <Text style={styles.time}>
          {duration > 0 ? formatRemaining(shown, duration) : "--:--"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 36, justifyContent: "center" },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  fill: { height: TRACK_HEIGHT },
  tick: {
    position: "absolute",
    width: 2,
    height: 10,
    marginLeft: -1,
    backgroundColor: "rgba(255,255,255,0.7)",
    top: 13,
  },
  thumb: { position: "absolute" },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  time: {
    color: PodcastTheme.textMuted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
});
