import type { SQLiteDatabase } from "expo-sqlite";

import { getPoints } from "../db/queries/points";
import { getPrefs, DEFAULT_PREFS } from "../db/queries/prefs";
import { getSplits } from "../db/queries/splits";
import {
  activeDays,
  dailyTotals,
  getWorkout,
  listWorkouts,
  personalBests,
  type DayTotal,
  type PersonalBests,
} from "../db/queries/workouts";
import type { ActivityType, Point, Split, Workout } from "../models/Workout";
import { paceSecPerKm } from "../tracking/metrics";
import { getSession, type Session } from "../tracking/state";
import { DAY_MS, startOfDay, startOfWeek } from "../utils/dates";
import { useLiveQuery } from "./useLiveQuery";

export function useWorkouts(type: ActivityType | null = null, limit = 500) {
  const select = (db: SQLiteDatabase) => listWorkouts(db, { type, limit });
  return useLiveQuery(["workouts"], select, [] as Workout[]);
}

export function useWorkout(id: string | undefined) {
  const select = (db: SQLiteDatabase) =>
    id ? getWorkout(db, id) : Promise.resolve(null);
  return useLiveQuery(["workouts"], select, null as Workout | null);
}

export function usePoints(id: string | undefined) {
  const select = (db: SQLiteDatabase) =>
    id ? getPoints(db, id) : Promise.resolve([]);
  return useLiveQuery(["points"], select, [] as Point[]);
}

export function useSplits(id: string | undefined) {
  const select = (db: SQLiteDatabase) =>
    id ? getSplits(db, id) : Promise.resolve([]);
  return useLiveQuery(["splits"], select, [] as Split[]);
}

const selectSession = (db: SQLiteDatabase) => getSession(db);
export function useSession() {
  return useLiveQuery(["session"], selectSession, null as Session | null);
}

const selectPrefs = (db: SQLiteDatabase) => getPrefs(db);
export function usePrefs() {
  return useLiveQuery(["prefs"], selectPrefs, DEFAULT_PREFS);
}

export type TodayStats = {
  today: DayTotal | null;
  week: DayTotal[];
  days: string[];
  recent: Workout[];
};

const selectToday = async (db: SQLiteDatabase): Promise<TodayStats> => {
  const now = Date.now();
  const [week, days, recent] = await Promise.all([
    dailyTotals(db, startOfDay(now) - 6 * DAY_MS),
    activeDays(db),
    listWorkouts(db, { limit: 3 }),
  ]);
  return {
    today: week.find((d) => d.day === startOfDay(now)) ?? null,
    week,
    days,
    recent,
  };
};
export function useTodayStats() {
  return useLiveQuery(["workouts"], selectToday, {
    today: null,
    week: [],
    days: [],
    recent: [],
  } as TodayStats);
}

export type StatsData = {
  weekly: { weekStart: number; distanceM: number; elevationM: number }[];
  paceTrend: { x: number; y: number }[];
  bests: PersonalBests;
};

const WEEKS = 12;
const selectStats = async (db: SQLiteDatabase): Promise<StatsData> => {
  const firstWeek = startOfWeek(Date.now()) - (WEEKS - 1) * 7 * DAY_MS;
  const workouts = await listWorkouts(db, { since: firstWeek, limit: 1000 });
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({
    weekStart: firstWeek + i * 7 * DAY_MS,
    distanceM: 0,
    elevationM: 0,
  }));
  for (const w of workouts) {
    const idx = Math.floor(
      (startOfWeek(w.startedAt) - firstWeek) / (7 * DAY_MS),
    );
    if (weekly[idx]) {
      weekly[idx].distanceM += w.distanceM;
      weekly[idx].elevationM += w.elevationGainM;
    }
  }
  const paceTrend = workouts
    .filter((w) => w.distanceM >= 1000 && w.movingMs > 0)
    .slice(0, 30)
    .reverse()
    .map((w, i) => ({ x: i, y: paceSecPerKm(w.distanceM, w.movingMs)! }));
  return { weekly, paceTrend, bests: await personalBests(db) };
};
export function useStats() {
  return useLiveQuery(["workouts", "splits"], selectStats, {
    weekly: [],
    paceTrend: [],
    bests: {
      longestDistance: null,
      longestDuration: null,
      fastestPace: null,
      mostClimb: null,
      fastestKmMs: null,
    },
  } as StatsData);
}
