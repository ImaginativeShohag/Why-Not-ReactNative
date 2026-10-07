/**
 * The live session, persisted in SQLite — never only in memory. The JS
 * runtime can be killed between two task invocations; everything the next
 * invocation needs (filter state, segment, pause bookkeeping) lives here.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type { ActivityType, TrackingMode } from "../models/Workout";
import { initialAutoPause, type AutoPauseState } from "./autoPause";
import { initialFilterState, type FilterState } from "./filters";

export type SessionStatus = "active" | "paused" | "autopaused";

export type Session = {
  workoutId: string;
  title: string;
  activity: ActivityType;
  mode: TrackingMode;
  status: SessionStatus;
  startedAt: number;
  segment: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  autoPause: boolean;
  voiceCues: boolean;
  /** true = TaskManager background updates; false = foreground watchPositionAsync fallback. */
  background: boolean;
  filter: FilterState;
  elevationRef: number | null;
  autoPauseState: AutoPauseState;
  lastKmAnnounced: number;
};

export function newSession(
  init: Pick<
    Session,
    | "workoutId"
    | "title"
    | "activity"
    | "mode"
    | "startedAt"
    | "autoPause"
    | "voiceCues"
    | "background"
  >,
): Session {
  return {
    ...init,
    status: "active",
    segment: 0,
    pausedAt: null,
    pausedTotalMs: 0,
    filter: initialFilterState,
    elevationRef: null,
    autoPauseState: initialAutoPause,
    lastKmAnnounced: 0,
  };
}

export async function getSession(db: SQLiteDatabase): Promise<Session | null> {
  const row = await db.getFirstAsync<{ state: string }>(
    "SELECT state FROM session WHERE id = 1",
  );
  return row ? (JSON.parse(row.state) as Session) : null;
}

export async function saveSession(db: SQLiteDatabase, session: Session) {
  await db.runAsync(
    "INSERT INTO session (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state",
    JSON.stringify(session),
  );
}

export async function clearSession(db: SQLiteDatabase) {
  await db.runAsync("DELETE FROM session WHERE id = 1");
}

/** Active (non-paused) time so far. Pure. */
export function activeElapsedMs(session: Session, now = Date.now()) {
  const end = session.pausedAt ?? now;
  return Math.max(0, end - session.startedAt - session.pausedTotalMs);
}

/** Pure transition: stop the clock. */
export function pauseSession(
  session: Session,
  at: number,
  status: "paused" | "autopaused",
): Session {
  if (session.status !== "active") return { ...session, status };
  return { ...session, status, pausedAt: at };
}

/** Pure transition: restart the clock in a fresh segment (no distance bridged). */
export function resumeSession(session: Session, at: number): Session {
  if (session.status === "active") return session;
  const pausedFor =
    session.pausedAt != null ? Math.max(0, at - session.pausedAt) : 0;
  return {
    ...session,
    status: "active",
    pausedAt: null,
    pausedTotalMs: session.pausedTotalMs + pausedFor,
    segment: session.segment + 1,
    autoPauseState: { stillSince: null, movingSince: null },
  };
}
