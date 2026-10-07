import type { CameraType, FlashMode } from "expo-camera";
import { useCallback, useMemo, useState } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

import { factorToZoom } from "@/src/projects/camera-social/utils/zoom";

export type CaptureMode = "photo" | "video" | "scan";

export const CAPTURE_MODES: CaptureMode[] = ["photo", "video", "scan"];

const FLASH_CYCLE: FlashMode[] = ["off", "auto", "on"];

/**
 * Camera hardware state: facing, flash, torch, zoom, mode and lens.
 *
 * Zoom is a shared value, not React state — pinch updates it on the UI thread
 * and it reaches the native view through animated props, so a pinch never
 * re-renders the screen.
 */
export function useCameraController() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [lenses, setLenses] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string | undefined>();
  const zoom = useSharedValue(0);

  const ultraWideLens = useMemo(
    () => lenses.find((l) => /ultra\s*wide/i.test(l)),
    [lenses],
  );
  const defaultLens = useMemo(
    () =>
      lenses.find((l) => /^back (dual |triple )?(wide )?camera$/i.test(l)) ??
      lenses.find((l) => !/ultra|tele/i.test(l)),
    [lenses],
  );

  const flip = useCallback(() => {
    setFacing((f) => (f === "back" ? "front" : "back"));
    setSelectedLens(undefined);
    setTorch(false);
    zoom.set(0);
  }, [zoom]);

  const cycleFlash = useCallback(() => {
    setFlash(
      (f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % FLASH_CYCLE.length],
    );
  }, []);

  const toggleTorch = useCallback(() => setTorch((t) => !t), []);

  /** Jump to a preset factor; `0.5` switches to the ultra-wide lens if present. */
  const setZoomFactor = useCallback(
    (factor: number) => {
      if (factor < 1) {
        if (!ultraWideLens) return;
        setSelectedLens(ultraWideLens);
        zoom.set(withTiming(0, { duration: 180 }));
        return;
      }
      if (selectedLens && selectedLens === ultraWideLens) {
        setSelectedLens(defaultLens);
      }
      zoom.set(withTiming(factorToZoom(factor), { duration: 180 }));
    },
    [defaultLens, selectedLens, ultraWideLens, zoom],
  );

  const changeMode = useCallback((next: CaptureMode) => {
    setMode(next);
    // Torch is a video-mode affordance; don't leave it burning in photo mode.
    if (next !== "video") setTorch(false);
  }, []);

  return {
    facing,
    flip,
    flash,
    cycleFlash,
    torch,
    toggleTorch,
    mode,
    setMode: changeMode,
    zoom,
    setZoomFactor,
    lenses,
    setLenses,
    selectedLens,
    isUltraWide: !!selectedLens && selectedLens === ultraWideLens,
    hasUltraWide: facing === "back" && !!ultraWideLens,
  };
}
