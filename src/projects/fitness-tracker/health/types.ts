import type { HeartRateSample, Point, Workout } from "../models/Workout";

export type HealthSyncResult = { ok: boolean; message: string };

export type HealthSync = {
  storeName: string;
  isAvailable(): Promise<boolean>;
  saveWorkout(
    workout: Workout,
    points: readonly Point[],
  ): Promise<HealthSyncResult>;
  readHeartRate(start: number, end: number): Promise<HeartRateSample[]>;
};
