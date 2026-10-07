import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type BarcodeScanningResult,
  type CameraOrientation,
} from "expo-camera";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useIsFocused, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Directions,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useShallow } from "zustand/react/shallow";

import { CameraTopBar } from "@/src/projects/camera-social/components/camera/CameraTopBar";
import {
  FocusRing,
  useFocusRing,
} from "@/src/projects/camera-social/components/camera/FocusRing";
import { LastShotButton } from "@/src/projects/camera-social/components/camera/LastShotButton";
import { ModeStrip } from "@/src/projects/camera-social/components/camera/ModeStrip";
import { QuickSettingsPanel } from "@/src/projects/camera-social/components/camera/QuickSettingsPanel";
import { ScanResultCard } from "@/src/projects/camera-social/components/camera/ScanResultCard";
import { ShutterButton } from "@/src/projects/camera-social/components/camera/ShutterButton";
import {
  FlashOverlay,
  FlyingThumbnail,
  useShutterFeedback,
  type Rect,
} from "@/src/projects/camera-social/components/camera/ShutterFeedback";
import { ZoomPills } from "@/src/projects/camera-social/components/camera/ZoomPills";
import { IconButton } from "@/src/projects/camera-social/components/common/IconButton";
import {
  gateState,
  PermissionGate,
} from "@/src/projects/camera-social/components/PermissionGate";
import { Palette } from "@/src/projects/camera-social/constants/theme";
import {
  CAPTURE_MODES,
  useCameraController,
  type CaptureMode,
} from "@/src/projects/camera-social/hooks/useCameraController";
import { useCapture } from "@/src/projects/camera-social/hooks/useCapture";
import {
  useSettings,
  type CameraSettings,
} from "@/src/projects/camera-social/hooks/useSettings";
import { useCaptureStore } from "@/src/projects/camera-social/stores/captureStore";
import { formatDuration } from "@/src/projects/camera-social/utils/format";
import {
  pinchToZoom,
  zoomToFactor,
  ZOOM_PRESETS,
} from "@/src/projects/camera-social/utils/zoom";

// Animated so `zoom` can be driven from a shared value on the UI thread.
const AnimatedCameraView = Animated.createAnimatedComponent(CameraView);

const MODE_LABELS: Record<CaptureMode, string> = {
  photo: "PHOTO",
  video: "VIDEO",
  scan: "SCAN",
};

const ORIENTATION_DEG: Record<CameraOrientation, number> = {
  portrait: 0,
  portraitUpsideDown: 180,
  landscapeLeft: 90,
  landscapeRight: -90,
};

const SETTING_ROWS: { key: keyof CameraSettings; label: string }[] = [
  { key: "shutterSound", label: "Shutter sound" },
  { key: "haptics", label: "Haptics" },
  { key: "saveToGallery", label: "Save to gallery" },
  { key: "keepExif", label: "Keep EXIF & location" },
];

export default function CameraScreen() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const router = useRouter();

  return (
    <PermissionGate
      status={permission}
      onRequest={requestPermission}
      onRecheck={getPermission}
      icon="camera"
      title="Camera access"
      rationale="Camera & Social needs the camera to take photos, record video and scan codes. Nothing leaves your device unless you share it."
      settingsHint="Camera access is turned off for this app. Turn it on in Settings to take photos."
      onCancel={() => router.back()}
    >
      <CameraCapture />
    </PermissionGate>
  );
}

function CameraCapture() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // Leaving the screen must release the camera: iOS via `active`, Android by
  // unmounting (the prop is iOS-only). Otherwise battery drains and the
  // preview is frozen when you come back.
  const isFocused = useIsFocused();

  const cameraRef = useRef<CameraView>(null);
  const lastShotRef = useRef<View>(null);
  const controller = useCameraController();
  const { settings, update } = useSettings();
  const { takePhoto, startRecording, stopRecording } = useCapture(
    cameraRef,
    settings,
  );
  const [micPermission, requestMic, getMic] = useMicrophonePermissions();
  const session = useCaptureStore(
    useShallow((s) => ({
      pending: s.pending,
      lastThumbUri: s.lastThumbUri,
      lastCaptureId: s.lastCaptureId,
      isRecording: s.isRecording,
      recordingStartedAt: s.recordingStartedAt,
      error: s.error,
    })),
  );

  const feedback = useShutterFeedback();
  const ring = useFocusRing();
  const startZoom = useSharedValue(0);

  const [ready, setReady] = useState(false);
  const [autofocus, setAutofocus] = useState<"on" | "off">("on");
  const [factor, setFactor] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flyUri, setFlyUri] = useState<string | null>(null);
  const [lastRect, setLastRect] = useState<Rect>({
    x: 24,
    y: window.height - 120,
    width: 52,
    height: 52,
  });
  const [scan, setScan] = useState<BarcodeScanningResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const { mode, zoom, isUltraWide } = controller;
  const micState = gateState(micPermission);

  // Live zoom label without re-rendering on every pinch frame: only when the
  // rounded factor changes.
  useAnimatedReaction(
    () => Math.round(zoomToFactor(zoom.get()) * 10) / 10,
    (value, previous) => {
      if (value !== previous) scheduleOnRN(setFactor, value);
    },
  );

  const animatedProps = useAnimatedProps(() => ({ zoom: zoom.get() }));

  // Recording timer. Ticks at 250ms to stay close to the wall clock, but only
  // stores whole seconds — React skips the render when the value is unchanged,
  // so the screen re-renders once per second, not four times.
  useEffect(() => {
    if (!session.isRecording || !session.recordingStartedAt) return;
    const startedAt = session.recordingStartedAt;
    const id = setInterval(
      // Rounded like formatDuration, so the label flips at the same moments.
      () => setElapsedSec(Math.round((Date.now() - startedAt) / 1000)),
      250,
    );
    return () => {
      clearInterval(id);
      setElapsedSec(0);
    };
  }, [session.isRecording, session.recordingStartedAt]);

  // Surface ingest failures briefly.
  useEffect(() => {
    if (!session.error) return;
    const id = setTimeout(() => useCaptureStore.getState().clearError(), 2800);
    return () => clearTimeout(id);
  }, [session.error]);

  const haptic = () => {
    if (settings.haptics)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  /** Tap-to-focus. expo-camera has no point-of-interest API; toggling autofocus forces a refocus. */
  const refocus = () => {
    setAutofocus("off");
    setTimeout(() => setAutofocus("on"), 60);
  };

  const changeMode = (next: CaptureMode) => {
    if (session.isRecording) return;
    setScan(null);
    controller.setMode(next);
  };

  const stepMode = (delta: number) => {
    const i = CAPTURE_MODES.indexOf(mode) + delta;
    if (i >= 0 && i < CAPTURE_MODES.length) changeMode(CAPTURE_MODES[i]);
  };

  const openLibrary = () => {
    if (!session.isRecording)
      router.dismissTo("/projects/camera-social/library");
  };

  const openLastShot = () => {
    if (session.lastCaptureId) {
      router.push(`/projects/camera-social/post/${session.lastCaptureId}`);
    }
  };

  // Gestures on the preview. Race: whichever recognizes first wins, so a
  // pinch never also fires a tap and a fling never also focuses.
  const pinch = Gesture.Pinch()
    .onStart(() => {
      startZoom.set(zoom.get());
    })
    .onUpdate((e) => {
      zoom.set(pinchToZoom(startZoom.get(), e.scale));
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scheduleOnRN(controller.flip);
    });
  const singleTap = Gesture.Tap().onEnd((e) => {
    ring.show(e.x, e.y);
    scheduleOnRN(refocus);
  });
  const flingUp = Gesture.Fling()
    .direction(Directions.UP)
    .onEnd(() => {
      scheduleOnRN(openLibrary);
    });
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      scheduleOnRN(stepMode, 1);
    });
  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      scheduleOnRN(stepMode, -1);
    });
  const previewGesture = Gesture.Race(
    pinch,
    flingUp,
    flingLeft,
    flingRight,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  // Shutter chain, link 1 (UI thread, at touch-down): haptic + flash.
  const onShutterUI = () => {
    "worklet";
    scheduleOnRN(haptic);
    feedback.flash();
  };

  const onShutter = async () => {
    if (mode === "photo") {
      const uri = await takePhoto();
      // Link 2: the frame flies into the corner once the sensor returns it.
      if (uri) {
        setFlyUri(uri);
        feedback.fly();
      }
      return;
    }
    if (mode === "video") {
      if (session.isRecording) {
        stopRecording();
      } else {
        haptic();
        void startRecording();
      }
    }
  };

  const onScanned = (result: BarcodeScanningResult) => {
    haptic();
    setScan(result);
  };

  const flyFrom: Rect = {
    x: window.width * 0.1,
    y: window.height * 0.2,
    width: window.width * 0.8,
    height: window.width * 0.8 * (4 / 3),
  };

  const presets = controller.hasUltraWide
    ? [0.5, ...ZOOM_PRESETS]
    : [...ZOOM_PRESETS];
  const displayFactor = isUltraWide ? 0.5 * factor : factor;
  const cameraMounted = Platform.OS === "ios" || isFocused;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={previewGesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {cameraMounted ? (
            <AnimatedCameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              active={isFocused}
              facing={controller.facing}
              flash={controller.flash}
              enableTorch={controller.torch}
              mode={mode === "video" ? "video" : "picture"}
              mute={micState !== "granted"}
              autofocus={autofocus}
              selectedLens={controller.selectedLens}
              animatedProps={animatedProps}
              responsiveOrientationWhenOrientationLocked
              onResponsiveOrientationChanged={(e) =>
                setRotation(ORIENTATION_DEG[e.orientation] ?? 0)
              }
              onAvailableLensesChanged={(e) => controller.setLenses(e.lenses)}
              onCameraReady={() => setReady(true)}
              onMountError={(e) =>
                useCaptureStore.getState().failCapture(e.message)
              }
              barcodeScannerSettings={{
                barcodeTypes: [
                  "qr",
                  "ean13",
                  "ean8",
                  "code128",
                  "pdf417",
                  "aztec",
                  "datamatrix",
                  "upc_a",
                  "upc_e",
                ],
              }}
              onBarcodeScanned={
                mode === "scan" && !scan ? onScanned : undefined
              }
            />
          ) : null}
          {mode === "scan" && !scan ? (
            <View pointerEvents="none" style={styles.reticleWrap}>
              <View style={styles.reticle} />
              <Text style={styles.reticleText}>
                Point at a QR code or barcode
              </Text>
            </View>
          ) : null}
          <FocusRing values={ring.values} />
        </View>
      </GestureDetector>

      <FlashOverlay opacity={feedback.flashOpacity} />

      <CameraTopBar
        topInset={insets.top}
        flash={controller.flash}
        onCycleFlash={controller.cycleFlash}
        showTorch={mode === "video"}
        torch={controller.torch}
        onToggleTorch={controller.toggleTorch}
        onSettings={() => setShowSettings((s) => !s)}
        onClose={() => router.back()}
        recordingLabel={session.isRecording ? formatDuration(elapsedSec) : null}
        iconRotation={rotation}
        disabled={session.isRecording}
      />

      {mode === "video" &&
      micState !== "granted" &&
      micState !== "loading" &&
      !session.isRecording ? (
        <Pressable
          style={[styles.micBanner, { top: insets.top + 64 }]}
          onPress={
            micState === "blocked"
              ? () => void Linking.openSettings()
              : () => void requestMic().then(getMic)
          }
          accessibilityRole="button"
        >
          <Text style={styles.micText}>
            {micState === "blocked"
              ? "Microphone is off — videos record silently. Open Settings"
              : "Allow the microphone to record sound"}
          </Text>
        </Pressable>
      ) : null}

      {session.error ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.toast, { top: insets.top + 64 }]}
        >
          <Text style={styles.toastText}>{session.error}</Text>
        </Animated.View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {scan ? (
          <ScanResultCard
            type={scan.type}
            data={scan.data}
            isLink={/^https?:\/\//i.test(scan.data)}
            onCopy={() => void Clipboard.setStringAsync(scan.data)}
            onOpen={() => void Linking.openURL(scan.data)}
            onDismiss={() => setScan(null)}
          />
        ) : null}
        {mode !== "scan" ? (
          <ZoomPills
            presets={presets}
            factor={displayFactor}
            onSelect={controller.setZoomFactor}
            iconRotation={rotation}
          />
        ) : null}
        <ModeStrip
          modes={CAPTURE_MODES}
          labels={MODE_LABELS}
          value={mode}
          onChange={changeMode}
          disabled={session.isRecording}
        />
        <View style={styles.controls}>
          <View
            ref={lastShotRef}
            collapsable={false}
            onLayout={() =>
              lastShotRef.current?.measureInWindow((x, y, width, height) =>
                setLastRect({ x, y, width, height }),
              )
            }
          >
            <LastShotButton
              thumbUri={session.lastThumbUri}
              pending={session.pending}
              bump={feedback.bump}
              onPress={openLastShot}
              iconRotation={rotation}
            />
          </View>
          <ShutterButton
            mode={mode}
            recording={session.isRecording}
            maxDurationSec={settings.maxVideoSeconds}
            onPress={onShutter}
            onPressUI={mode === "photo" ? onShutterUI : undefined}
            disabled={!ready}
          />
          <IconButton
            icon="camera-reverse-outline"
            size={30}
            onPress={controller.flip}
            disabled={session.isRecording}
            accessibilityLabel="Flip camera"
            iconRotation={rotation}
            style={styles.flip}
          />
        </View>
      </View>

      <FlyingThumbnail
        uri={flyUri}
        progress={feedback.flyProgress}
        visible={feedback.flyVisible}
        from={flyFrom}
        to={lastRect}
      />

      {showSettings ? (
        <QuickSettingsPanel
          top={insets.top + 60}
          rows={SETTING_ROWS.map((r) => ({
            key: r.key,
            label: r.label,
            value: settings[r.key] as boolean,
          }))}
          onToggle={(key, value) => update({ [key]: value })}
          onDismiss={() => setShowSettings(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 12 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  flip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  reticleWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Palette.accent,
  },
  reticleText: { color: Palette.text, marginTop: 16, fontWeight: "600" },
  micBanner: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  micText: { color: Palette.text, fontSize: 13, fontWeight: "600" },
  toast: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: Palette.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  toastText: { color: "#fff", fontWeight: "600" },
});
