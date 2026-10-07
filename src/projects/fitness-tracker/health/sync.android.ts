import {
  ExerciseType,
  getSdkStatus,
  initialize,
  insertRecords,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";

import type { ActivityType } from "../models/Workout";
import type { HealthSync } from "./types";

const HC_TYPE: Record<ActivityType, number> = {
  run: ExerciseType.RUNNING,
  walk: ExerciseType.WALKING,
  cycle: ExerciseType.BIKING,
  hike: ExerciseType.HIKING,
};

async function ready() {
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  return initialize();
}

export const health: HealthSync = {
  storeName: "Health Connect",
  isAvailable: () => ready().catch(() => false),

  async saveWorkout(workout, points) {
    if (!(await ready()))
      return {
        ok: false,
        message: "Health Connect is not installed or needs an update.",
      };
    await requestPermission([
      { accessType: "write", recordType: "ExerciseSession" },
      { accessType: "write", recordType: "Distance" },
      { accessType: "write", recordType: "TotalCaloriesBurned" },
      { accessType: "write", recordType: "ExerciseRoute" },
      { accessType: "read", recordType: "HeartRate" },
    ]);
    const startTime = new Date(workout.startedAt).toISOString();
    const endTime = new Date(
      workout.endedAt ?? workout.startedAt + workout.movingMs,
    ).toISOString();
    await insertRecords([
      {
        recordType: "ExerciseSession",
        startTime,
        endTime,
        exerciseType: HC_TYPE[workout.type],
        title: workout.title,
        exerciseRoute: {
          route: points.map((p) => ({
            time: new Date(p.t).toISOString(),
            latitude: p.lat,
            longitude: p.lng,
            ...(p.alt != null
              ? { altitude: { value: p.alt, unit: "meters" as const } }
              : {}),
            ...(p.acc != null
              ? {
                  horizontalAccuracy: { value: p.acc, unit: "meters" as const },
                }
              : {}),
          })),
        },
      },
      {
        recordType: "Distance",
        startTime,
        endTime,
        distance: { value: workout.distanceM, unit: "meters" },
      },
      {
        recordType: "TotalCaloriesBurned",
        startTime,
        endTime,
        energy: { value: workout.calories, unit: "kilocalories" },
      },
    ]);
    return { ok: true, message: "Saved to Health Connect with route." };
  },

  async readHeartRate(start, end) {
    try {
      if (!(await ready())) return [];
      const { records } = await readRecords("HeartRate", {
        timeRangeFilter: {
          operator: "between",
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
        },
      });
      return records.flatMap((r) =>
        r.samples.map((s) => ({
          t: Date.parse(s.time),
          bpm: s.beatsPerMinute,
        })),
      );
    } catch {
      return [];
    }
  },
};
