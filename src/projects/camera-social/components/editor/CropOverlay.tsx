import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import {
  clampScale,
  clampTranslate,
  cropRectFromTransform,
  fitAspect,
  maxTranslate,
  rectAspect,
  transformFromCropRect,
} from "@/src/projects/camera-social/editor/cropMath";
import type { NormRect, Size } from "@/src/projects/camera-social/models/Asset";

type Props = {
  /** Size of the container the overlay fills. */
  area: Size;
  /** Pixel size of the (rotated) image being cropped — only its aspect matters. */
  oriented: Size;
  /** Fixed frame aspect (w/h), or null for free-form with a resize handle. */
  aspect: number | null;
  initialRect: NormRect;
  /** Renders the image at the given base display size. */
  renderImage: (display: Size) => ReactNode;
  onChange: (rect: NormRect) => void;
  /** A rotation gesture past 45° snaps to a quarter turn. */
  onRotate: (degrees: 90 | -90) => void;
};

const INSET = 24;
const MIN_FRAME = 64;
const HANDLE = 28;

/**
 * Fixed crop frame over a movable image: pinch + pan + rotate composed with
 * Gesture.Simultaneous, clamped (with momentum decay) so the image can never
 * leave the frame. Only a normalized rect leaves this component.
 */
export function CropOverlay({
  area,
  oriented,
  aspect,
  initialRect,
  renderImage,
  onChange,
  onRotate,
}: Props) {
  const bounds = {
    width: area.width - INSET * 2,
    height: area.height - INSET * 2,
  };
  const display = fitAspect(oriented.width / oriented.height, bounds);

  const rectRatio = rectAspect(initialRect, oriented);
  const keepRect = aspect == null || Math.abs(rectRatio - aspect) < 0.01;
  const frame0 = fitAspect(
    keepRect ? rectRatio : (aspect ?? rectRatio),
    display,
  );
  const t0 = keepRect
    ? transformFromCropRect(initialRect, display, frame0)
    : { scale: 1, tx: 0, ty: 0 };

  const scale = useSharedValue(t0.scale);
  const tx = useSharedValue(t0.tx);
  const ty = useSharedValue(t0.ty);
  const rot = useSharedValue(0);
  const frameW = useSharedValue(frame0.width);
  const frameH = useSharedValue(frame0.height);
  const start = useSharedValue({ scale: 1, tx: 0, ty: 0, fw: 0, fh: 0 });
  // Which pan's momentum is settling, and how many of its axes still decay.
  const settleId = useSharedValue(0);
  const settleLeft = useSharedValue(0);

  const emit = (rect: NormRect) => onChange(rect);

  // Tell the parent the starting rect (it may have been re-centred for a new preset).
  useEffect(() => {
    onChange(cropRectFromTransform(t0, display, frame0));
    // Intentionally once per mount — the parent remounts us via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitCurrent = () => {
    "worklet";
    const rect = cropRectFromTransform(
      { scale: scale.get(), tx: tx.get(), ty: ty.get() },
      display,
      { width: frameW.get(), height: frameH.get() },
    );
    scheduleOnRN(emit, rect);
  };

  // Each axis decays on its own clock; report once the slower one stops.
  // Callbacks can fire synchronously inside `set` (a decay that is already
  // at rest, or an older decay being replaced), so each pan stamps its own id
  // and stale callbacks are ignored. A cancelled decay (another gesture took
  // over) doesn't emit — that gesture's own onEnd does.
  const onAxisSettled = (id: number, finished?: boolean) => {
    "worklet";
    if (id !== settleId.get()) return;
    settleLeft.set(settleLeft.get() - 1);
    if (finished && settleLeft.get() === 0) emitCurrent();
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.set({ ...start.get(), scale: scale.get() });
    })
    .onUpdate((e) => {
      const frame = { width: frameW.get(), height: frameH.get() };
      const s = clampScale(start.get().scale * e.scale, display, frame);
      scale.set(s);
      const t = clampTranslate(tx.get(), ty.get(), s, display, frame);
      tx.set(t.tx);
      ty.set(t.ty);
    })
    .onEnd(() => {
      emitCurrent();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      start.set({ ...start.get(), tx: tx.get(), ty: ty.get() });
    })
    .onUpdate((e) => {
      const frame = { width: frameW.get(), height: frameH.get() };
      const t = clampTranslate(
        start.get().tx + e.translationX,
        start.get().ty + e.translationY,
        scale.get(),
        display,
        frame,
      );
      tx.set(t.tx);
      ty.set(t.ty);
    })
    .onEnd((e) => {
      const frame = { width: frameW.get(), height: frameH.get() };
      const m = maxTranslate(scale.get(), display, frame);
      // Momentum that stops at the frame edge instead of overshooting it.
      const id = settleId.get() + 1;
      settleId.set(id);
      settleLeft.set(2);
      tx.set(
        withDecay({ velocity: e.velocityX, clamp: [-m.x, m.x] }, (done) =>
          onAxisSettled(id, done),
        ),
      );
      ty.set(
        withDecay({ velocity: e.velocityY, clamp: [-m.y, m.y] }, (done) =>
          onAxisSettled(id, done),
        ),
      );
      emitCurrent();
    });

  const rotation = Gesture.Rotation()
    .onUpdate((e) => {
      rot.set(e.rotation);
    })
    .onEnd((e) => {
      if (Math.abs(e.rotation) > Math.PI / 4) {
        scheduleOnRN(onRotate, e.rotation > 0 ? 90 : -90);
      }
      rot.set(withSpring(0));
    });

  const resize = Gesture.Pan()
    .enabled(aspect == null)
    .onStart(() => {
      start.set({ ...start.get(), fw: frameW.get(), fh: frameH.get() });
    })
    .onUpdate((e) => {
      const s = scale.get();
      // Frame is centred, so a corner drag grows it by twice the distance.
      const fw = Math.min(
        bounds.width,
        display.width * s,
        Math.max(MIN_FRAME, start.get().fw + e.translationX * 2),
      );
      const fh = Math.min(
        bounds.height,
        display.height * s,
        Math.max(MIN_FRAME, start.get().fh + e.translationY * 2),
      );
      frameW.set(fw);
      frameH.set(fh);
      const t = clampTranslate(tx.get(), ty.get(), s, display, {
        width: fw,
        height: fh,
      });
      tx.set(t.tx);
      ty.set(t.ty);
    })
    .onEnd(() => {
      emitCurrent();
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { rotate: `${rot.get()}rad` },
      { scale: scale.get() },
    ],
  }));

  const frameStyle = useAnimatedStyle(() => ({
    width: frameW.get(),
    height: frameH.get(),
    left: (area.width - frameW.get()) / 2,
    top: (area.height - frameH.get()) / 2,
  }));
  const maskTop = useAnimatedStyle(() => ({
    height: (area.height - frameH.get()) / 2,
  }));
  const maskBottom = useAnimatedStyle(() => ({
    height: (area.height - frameH.get()) / 2,
  }));
  const maskSide = useAnimatedStyle(() => ({
    top: (area.height - frameH.get()) / 2,
    height: frameH.get(),
    width: (area.width - frameW.get()) / 2,
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, rotation)}>
      <View
        style={[styles.area, { width: area.width, height: area.height }]}
        collapsable={false}
      >
        <Animated.View
          style={[
            styles.image,
            {
              width: display.width,
              height: display.height,
              left: (area.width - display.width) / 2,
              top: (area.height - display.height) / 2,
            },
            imageStyle,
          ]}
        >
          {renderImage(display)}
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.mask, styles.maskTop, maskTop]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.mask, styles.maskBottom, maskBottom]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.mask, { left: 0 }, maskSide]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.mask, { right: 0 }, maskSide]}
        />

        <Animated.View
          pointerEvents="box-none"
          style={[styles.frame, frameStyle]}
        >
          <View
            pointerEvents="none"
            style={[styles.grid, styles.gridV, { left: "33.33%" }]}
          />
          <View
            pointerEvents="none"
            style={[styles.grid, styles.gridV, { left: "66.66%" }]}
          />
          <View
            pointerEvents="none"
            style={[styles.grid, styles.gridH, { top: "33.33%" }]}
          />
          <View
            pointerEvents="none"
            style={[styles.grid, styles.gridH, { top: "66.66%" }]}
          />
          {aspect == null ? (
            <GestureDetector gesture={resize}>
              <View style={styles.handle} accessibilityLabel="Resize crop" />
            </GestureDetector>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: { overflow: "hidden" },
  image: { position: "absolute" },
  mask: { position: "absolute", backgroundColor: "rgba(0,0,0,0.6)" },
  maskTop: { top: 0, left: 0, right: 0 },
  maskBottom: { bottom: 0, left: 0, right: 0 },
  frame: { position: "absolute", borderWidth: 1.5, borderColor: "#fff" },
  grid: { position: "absolute", backgroundColor: "rgba(255,255,255,0.35)" },
  gridV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridH: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
  handle: {
    position: "absolute",
    right: -HANDLE / 2,
    bottom: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#fff",
  },
});
