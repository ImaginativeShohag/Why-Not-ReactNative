import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { Size } from "@/src/projects/camera-social/models/Asset";

type Props = {
  uri: string;
  /** Low-res image shown until the original decodes. */
  placeholderUri?: string;
  /** Pixel size of the image — only the aspect is used. */
  image: Size;
  /** Size of the page the image sits in. */
  viewport: Size;
  recyclingKey?: string;
  /** Fires when the image crosses in/out of the zoomed state. */
  onZoomChange?: (zoomed: boolean) => void;
  onSingleTap?: () => void;
};

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SPRING = { damping: 20, stiffness: 220 };

/** Fitted ("contain") size of the image inside the viewport. */
function containSize(image: Size, viewport: Size): Size {
  "worklet";
  const aspect = image.width / image.height;
  return viewport.width / viewport.height > aspect
    ? { width: viewport.height * aspect, height: viewport.height }
    : { width: viewport.width, height: viewport.width / aspect };
}

function clampOffset(value: number, scale: number, base: number, view: number) {
  "worklet";
  const max = Math.max(0, (base * scale - view) / 2);
  return Math.min(max, Math.max(-max, value));
}

/**
 * Pinch-zoom, double-tap zoom and pan-when-zoomed, all on the UI thread.
 *
 * The pan uses manual activation: at 1× it fails immediately so the pager's
 * horizontal scroll and the dismiss drag get the touch; zoomed in, it claims
 * the touch so panning never flips the page underneath you.
 */
export function ZoomableImage({
  uri,
  placeholderUri,
  image,
  viewport,
  recyclingKey,
  onZoomChange,
  onSingleTap,
}: Props) {
  const base = containSize(image, viewport);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const start = useSharedValue({ scale: 1, tx: 0, ty: 0 });
  const zoomed = useSharedValue(false);

  const reportZoom = (value: boolean) => onZoomChange?.(value);
  const tap = () => onSingleTap?.();

  const setZoomed = (value: boolean) => {
    "worklet";
    if (zoomed.get() === value) return;
    zoomed.set(value);
    scheduleOnRN(reportZoom, value);
  };

  const settle = () => {
    "worklet";
    if (scale.get() <= 1.01) {
      scale.set(withSpring(1, SPRING));
      tx.set(withSpring(0, SPRING));
      ty.set(withSpring(0, SPRING));
      setZoomed(false);
      return;
    }
    const s = Math.min(MAX_SCALE, scale.get());
    scale.set(withSpring(s, SPRING));
    tx.set(
      withSpring(clampOffset(tx.get(), s, base.width, viewport.width), SPRING),
    );
    ty.set(
      withSpring(
        clampOffset(ty.get(), s, base.height, viewport.height),
        SPRING,
      ),
    );
    setZoomed(true);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.set({ scale: scale.get(), tx: tx.get(), ty: ty.get() });
    })
    .onUpdate((e) => {
      const s0 = start.get();
      const next = Math.max(0.8, Math.min(MAX_SCALE * 1.2, s0.scale * e.scale));
      // Keep the pixel under the fingers still: focal point relative to centre.
      const fx = e.focalX - viewport.width / 2;
      const fy = e.focalY - viewport.height / 2;
      const k = next / s0.scale;
      scale.set(next);
      tx.set(fx - (fx - s0.tx) * k);
      ty.set(fy - (fy - s0.ty) * k);
      if (next > 1.01) setZoomed(true);
    })
    .onEnd(settle);

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_e, manager) => {
      if (scale.get() > 1.01) manager.activate();
      else manager.fail();
    })
    .onStart(() => {
      start.set({ scale: scale.get(), tx: tx.get(), ty: ty.get() });
    })
    .onUpdate((e) => {
      const s0 = start.get();
      tx.set(s0.tx + e.translationX);
      ty.set(s0.ty + e.translationY);
    })
    .onEnd((e) => {
      const s = scale.get();
      const maxX = Math.max(0, (base.width * s - viewport.width) / 2);
      const maxY = Math.max(0, (base.height * s - viewport.height) / 2);
      // Momentum that stops at the image edge.
      tx.set(withDecay({ velocity: e.velocityX, clamp: [-maxX, maxX] }));
      ty.set(withDecay({ velocity: e.velocityY, clamp: [-maxY, maxY] }));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.get() > 1.01) {
        scale.set(withTiming(1));
        tx.set(withTiming(0));
        ty.set(withTiming(0));
        setZoomed(false);
        return;
      }
      const s = DOUBLE_TAP_SCALE;
      const fx = e.x - viewport.width / 2;
      const fy = e.y - viewport.height / 2;
      scale.set(withTiming(s));
      tx.set(
        withTiming(clampOffset(-fx * (s - 1), s, base.width, viewport.width)),
      );
      ty.set(
        withTiming(clampOffset(-fy * (s - 1), s, base.height, viewport.height)),
      );
      setZoomed(true);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      scheduleOnRN(tap);
    });

  const gesture = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.page,
          { width: viewport.width, height: viewport.height },
        ]}
        collapsable={false}
      >
        <Animated.View
          style={[{ width: base.width, height: base.height }, style]}
        >
          <Image
            source={{ uri }}
            placeholder={placeholderUri ? { uri: placeholderUri } : undefined}
            placeholderContentFit="contain"
            contentFit="contain"
            recyclingKey={recyclingKey}
            transition={120}
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
