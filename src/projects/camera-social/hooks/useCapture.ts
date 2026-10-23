import type { CameraView } from "expo-camera";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { AppState } from "react-native";

import { getCapture } from "@/src/projects/camera-social/db/captures";
import type { CameraSettings } from "@/src/projects/camera-social/hooks/useSettings";
import {
  ingestPhoto,
  ingestVideo,
} from "@/src/projects/camera-social/media/ingest";
import { probeVideoDurationMs } from "@/src/projects/camera-social/media/videoInfo";
import { useCaptureStore } from "@/src/projects/camera-social/stores/captureStore";
import { saveToGallery } from "@/src/projects/camera-social/utils/shareOut";

const STOP_RETRY_MS = 250;
const STOP_RETRY_LIMIT = 20;

/**
 * takePicture / record orchestration.
 *
 * The shutter only waits for the sensor (`takePictureAsync`), never for disk:
 * ingest (copy → thumbnail → DB row) runs behind it, so ten rapid taps give
 * ten captures without a frozen UI. Captures are serialized at the camera
 * because the native session rejects overlapping requests.
 */
export function useCapture(
  cameraRef: RefObject<CameraView | null>,
  settings: CameraSettings,
) {
  const db = useSQLiteContext();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const recordStartedAt = useRef<number | null>(null);
  // A stop tapped before the native recorder has started is a silent no-op
  // (iOS configures the output first), so it's retried until recordAsync settles.
  const stopRetry = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelStopRetry = useCallback(() => {
    if (stopRetry.current) clearInterval(stopRetry.current);
    stopRetry.current = null;
  }, []);

  const afterIngest = useCallback(
    async (id: string) => {
      const capture = await getCapture(db, id);
      if (!capture) return;
      useCaptureStore.getState().finishCapture(id, capture.thumbUri);
      if (settings.saveToGallery) {
        // Best-effort: the capture is safe in the app, so a failed gallery
        // save is a toast rather than a failed capture.
        saveToGallery(capture.uri).catch((e: unknown) => {
          console.warn("[camera-social] gallery save failed", e);
          useCaptureStore
            .getState()
            .showError(
              e instanceof Error
                ? `Not saved to gallery: ${e.message}`
                : "Not saved to gallery",
            );
        });
      }
    },
    [db, settings.saveToGallery],
  );

  /** Resolves with the temp URI as soon as the sensor has the frame. */
  const takePhoto = useCallback((): Promise<string | null> => {
    const store = useCaptureStore.getState();
    store.beginCapture();

    const shot = queue.current.then(() =>
      cameraRef.current?.takePictureAsync({
        quality: 0.9,
        exif: settings.keepExif,
        shutterSound: settings.shutterSound,
      }),
    );
    queue.current = shot.catch(() => undefined);

    shot
      .then(async (picture) => {
        if (!picture) throw new Error("Camera is not ready");
        const id = await ingestPhoto(db, {
          uri: picture.uri,
          width: picture.width,
          height: picture.height,
          exif: settings.keepExif ? picture.exif : null,
          origin: "camera",
        });
        await afterIngest(id);
      })
      .catch((e: unknown) =>
        useCaptureStore
          .getState()
          .failCapture(e instanceof Error ? e.message : "Capture failed"),
      );

    return shot.then((p) => p?.uri ?? null).catch(() => null);
  }, [afterIngest, cameraRef, db, settings.keepExif, settings.shutterSound]);

  const startRecording = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera || useCaptureStore.getState().isRecording) return;
    const store = useCaptureStore.getState();
    store.startRecording();
    recordStartedAt.current = Date.now();
    try {
      // Resolves when stopRecording() runs, maxDuration hits, or the preview stops.
      const result = await camera.recordAsync({
        maxDuration: settings.maxVideoSeconds,
      });
      // Settle the stop queue now, before ingest: a new recording may start
      // while this clip is still being ingested.
      cancelStopRetry();
      // Wall clock is only the fallback: it includes session start/stop lag.
      const wallClockMs = recordStartedAt.current
        ? Date.now() - recordStartedAt.current
        : null;
      useCaptureStore.getState().stopRecording();
      if (!result?.uri) return;
      useCaptureStore.getState().beginCapture();
      const durationMs =
        (await probeVideoDurationMs(result.uri)) ?? wallClockMs;
      const id = await ingestVideo(db, {
        uri: result.uri,
        durationMs,
        origin: "camera",
      });
      await afterIngest(id);
    } catch (e) {
      cancelStopRetry();
      useCaptureStore.getState().stopRecording();
      useCaptureStore
        .getState()
        .failCapture(e instanceof Error ? e.message : "Recording failed");
    } finally {
      recordStartedAt.current = null;
    }
  }, [afterIngest, cameraRef, cancelStopRetry, db, settings.maxVideoSeconds]);

  const stopRecording = useCallback(() => {
    cameraRef.current?.stopRecording();
    if (recordStartedAt.current == null || stopRetry.current) return;
    let attempts = 0;
    stopRetry.current = setInterval(() => {
      attempts += 1;
      // startRecording cancels this once recordAsync settles.
      if (recordStartedAt.current == null || attempts > STOP_RETRY_LIMIT) {
        cancelStopRetry();
        return;
      }
      cameraRef.current?.stopRecording();
    }, STOP_RETRY_MS);
  }, [cameraRef, cancelStopRetry]);

  useEffect(() => cancelStopRetry, [cancelStopRetry]);

  // Backgrounding mid-recording: stop cleanly so the partial clip is kept
  // rather than letting the OS tear the session down under us.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && useCaptureStore.getState().isRecording) {
        cameraRef.current?.stopRecording();
      }
    });
    return () => sub.remove();
  }, [cameraRef]);

  return { takePhoto, startRecording, stopRecording };
}
