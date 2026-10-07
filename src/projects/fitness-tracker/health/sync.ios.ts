import {
  isHealthDataAvailableAsync,
  queryQuantitySamples,
  requestAuthorization,
  saveWorkoutSample,
  WorkoutActivityType,
} from "@kingstinct/react-native-healthkit";

import type { ActivityType } from "../models/Workout";
import type { HealthSync } from "./types";

const HK_TYPE: Record<ActivityType, WorkoutActivityType> = {
  run: WorkoutActivityType.running,
  walk: WorkoutActivityType.walking,
  cycle: WorkoutActivityType.cycling,
  hike: WorkoutActivityType.hiking,
};

async function authorize() {
  return requestAuthorization({
    toShare: [
      "HKWorkoutTypeIdentifier",
      "HKWorkoutRouteTypeIdentifier",
      "HKQuantityTypeIdentifierDistanceWalkingRunning",
      "HKQuantityTypeIdentifierDistanceCycling",
      "HKQuantityTypeIdentifierActiveEnergyBurned",
    ],
    toRead: ["HKQuantityTypeIdentifierHeartRate"],
  });
}

export const health: HealthSync = {
  storeName: "Apple Health",
  isAvailable: () => isHealthDataAvailableAsync().catch(() => false),

  async saveWorkout(workout, points) {
    if (!(await isHealthDataAvailableAsync()))
      return { ok: false, message: "HealthKit unavailable." };
    await authorize();
    const start = new Date(workout.startedAt);
    const end = new Date(
      workout.endedAt ?? workout.startedAt + workout.movingMs,
    );
    const proxy = await saveWorkoutSample(
      HK_TYPE[workout.type],
      [
        {
          startDate: start,
          endDate: end,
          quantityType:
            workout.type === "cycle"
              ? "HKQuantityTypeIdentifierDistanceCycling"
              : "HKQuantityTypeIdentifierDistanceWalkingRunning",
          quantity: workout.distanceM,
          unit: "m",
        },
        {
          startDate: start,
          endDate: end,
          quantityType: "HKQuantityTypeIdentifierActiveEnergyBurned",
          quantity: workout.calories,
          unit: "kcal",
        },
      ],
      start,
      end,
      { distance: workout.distanceM, energyBurned: workout.calories },
      { HKExternalUUID: workout.id },
    );
    if (points.length > 1) {
      await proxy.saveWorkoutRoute(
        points.map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
          altitude: p.alt ?? 0,
          horizontalAccuracy: p.acc ?? 10,
          verticalAccuracy: p.alt != null ? 10 : -1,
          speed: p.speed ?? -1,
          course: -1,
          date: new Date(p.t),
        })),
      );
    }
    return { ok: true, message: "Saved to Apple Health with route." };
  },

  async readHeartRate(start, end) {
    try {
      await authorize();
      const samples = await queryQuantitySamples(
        "HKQuantityTypeIdentifierHeartRate",
        {
          limit: 0,
          unit: "count/min",
          ascending: true,
          filter: {
            date: { startDate: new Date(start), endDate: new Date(end) },
          },
        },
      );
      return samples.map((s) => ({
        t: new Date(s.startDate).getTime(),
        bpm: s.quantity,
      }));
    } catch {
      return [];
    }
  },
};
