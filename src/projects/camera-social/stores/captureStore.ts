import { create } from "zustand";

/**
 * Transient capture-session state: things the camera UI needs to react to but
 * that must never be persisted. Durable data lives in SQLite.
 */
type CaptureSession = {
  /** Captures taken but not yet ingested — the shutter never waits on disk. */
  pending: number;
  /** Most recent ingested thumbnail, shown in the corner button. */
  lastThumbUri: string | null;
  lastCaptureId: string | null;
  isRecording: boolean;
  recordingStartedAt: number | null;
  error: string | null;

  beginCapture: () => void;
  finishCapture: (id: string, thumbUri: string) => void;
  failCapture: (message: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  clearError: () => void;
};

export const useCaptureStore = create<CaptureSession>()((set) => ({
  pending: 0,
  lastThumbUri: null,
  lastCaptureId: null,
  isRecording: false,
  recordingStartedAt: null,
  error: null,

  beginCapture: () => set((s) => ({ pending: s.pending + 1 })),
  finishCapture: (id, thumbUri) =>
    set((s) => ({
      pending: Math.max(0, s.pending - 1),
      lastCaptureId: id,
      lastThumbUri: thumbUri,
    })),
  failCapture: (message) =>
    set((s) => ({ pending: Math.max(0, s.pending - 1), error: message })),
  startRecording: () =>
    set({ isRecording: true, recordingStartedAt: Date.now() }),
  stopRecording: () => set({ isRecording: false, recordingStartedAt: null }),
  clearError: () => set({ error: null }),
}));
