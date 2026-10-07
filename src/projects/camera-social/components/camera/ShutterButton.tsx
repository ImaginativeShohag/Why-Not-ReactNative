import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Palette } from "@/src/projects/camera-social/constants/theme";

export type ShutterMode = "photo" | "video" | "scan";

type Props = {
  mode: ShutterMode;
  recording: boolean;
  /** Length of the progress ring while recording. */
  maxDurationSec: number;
  onPress: () => void;
  /**
   * Optional worklet run on the UI thread at touch-down, before any JS work —
   * the first link of the shutter feedback chain.
   */
  onPressUI?: () => void;
  disabled?: boolean;
};

const SIZE = 78;
const STROKE = 4;

const ring = (() => {
  const p = Skia.Path.Make();
  const r = SIZE / 2 - STROKE / 2;
  // Start at 12 o'clock so progress sweeps clockwise from the top.
  p.addArc(
    { x: STROKE / 2, y: STROKE / 2, width: r * 2, height: r * 2 },
    -90,
    359.99,
  );
  return p;
})();

/**
 * Circle in photo mode → red dot in video mode → red rounded square while
 * recording → gone in scan mode. One animated inner view morphs between them.
 */
export function ShutterButton({
  mode,
  recording,
  maxDurationSec,
  onPress,
  onPressUI,
  disabled,
}: Props) {
  const pressed = useSharedValue(1);
  const isVideo = useSharedValue(mode === "video" ? 1 : 0);
  const isRecording = useSharedValue(recording ? 1 : 0);
  const visible = useSharedValue(mode === "scan" ? 0 : 1);
  const progress = useSharedValue(0);

  useEffect(() => {
    isVideo.set(withTiming(mode === "video" ? 1 : 0, { duration: 200 }));
    visible.set(withTiming(mode === "scan" ? 0 : 1, { duration: 200 }));
  }, [mode, isVideo, visible]);

  useEffect(() => {
    isRecording.set(withSpring(recording ? 1 : 0, { damping: 16 }));
    if (recording) {
      progress.set(0);
      progress.set(
        withTiming(1, {
          duration: maxDurationSec * 1000,
          easing: Easing.linear,
        }),
      );
    } else {
      cancelAnimation(progress);
      progress.set(withTiming(0, { duration: 150 }));
    }
  }, [recording, maxDurationSec, isRecording, progress]);

  const tap = Gesture.Tap()
    .enabled(!disabled && mode !== "scan")
    .onBegin(() => {
      pressed.set(withTiming(0.88, { duration: 80 }));
      if (onPressUI) onPressUI();
    })
    .onFinalize(() => {
      pressed.set(withSpring(1));
    })
    .onEnd(() => {
      scheduleOnRN(onPress);
    });

  const outerStyle = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ scale: pressed.get() * (0.6 + 0.4 * visible.get()) }],
  }));

  const innerStyle = useAnimatedStyle(() => {
    const rec = isRecording.get();
    const inner = SIZE - 16;
    const size = inner - rec * (inner - 30);
    return {
      width: size,
      height: size,
      borderRadius: size / 2 - rec * (size / 2 - 7),
      backgroundColor: interpolateColor(
        isVideo.get(),
        [0, 1],
        [Palette.text, Palette.record],
      ),
    };
  });

  const ringEnd = useDerivedValue(() => progress.get());

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[styles.outer, outerStyle]}
        accessibilityRole="button"
        accessibilityLabel={
          mode === "video"
            ? recording
              ? "Stop recording"
              : "Start recording"
            : "Take photo"
        }
      >
        <View style={styles.track} />
        <Canvas style={StyleSheet.absoluteFill}>
          <Path
            path={ring}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            color={Palette.record}
            start={0}
            end={ringEnd}
          />
        </Canvas>
        <Animated.View style={innerStyle} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    borderWidth: STROKE,
    borderColor: "rgba(255,255,255,0.9)",
  },
});
