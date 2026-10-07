import { create } from "zustand";

export type SyncPhase = "idle" | "syncing" | "error";

export type SyncResult = {
  pulled: number;
  pushed: number;
  failed: number;
  /** Why the run did nothing, when it did nothing. */
  skipped?: "disabled" | "offline";
  error?: string;
};

type SyncState = {
  phase: SyncPhase;
  last: SyncResult | null;
  setPhase: (phase: SyncPhase) => void;
  finish: (result: SyncResult) => void;
};

/**
 * In-memory run state written by the (non-React) sync engine and read by the
 * status hook. Durable facts — pending count, last synced time, last error —
 * live in SQLite instead, so they survive restarts and can never disagree
 * with the outbox.
 */
export const useSyncStore = create<SyncState>((set) => ({
  phase: "idle",
  last: null,
  setPhase: (phase) => set({ phase }),
  finish: (result) =>
    set({ last: result, phase: result.error ? "error" : "idle" }),
}));
