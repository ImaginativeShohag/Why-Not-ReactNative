import { Pedometer } from "expo-sensors";
import { Platform } from "react-native";

import { startOfDay } from "../utils/dates";

export async function isPedometerAvailable() {
  return Pedometer.isAvailableAsync().catch(() => false);
}

/**
 * Historical step counts come from CoreMotion on iOS. Android's step counter
 * has no history API through expo-sensors, so there we can only count from
 * the moment we start watching (returns null → caller shows live count only).
 */
export async function getStepsBetween(
  start: Date,
  end: Date,
): Promise<number | null> {
  if (Platform.OS !== "ios") return null;
  try {
    const { steps } = await Pedometer.getStepCountAsync(start, end);
    return steps;
  } catch {
    return null;
  }
}

export function getTodaySteps() {
  return getStepsBetween(new Date(startOfDay(Date.now())), new Date());
}

/** Steps since subscription. */
export function watchSteps(onSteps: (stepsSinceStart: number) => void) {
  return Pedometer.watchStepCount(({ steps }) => onSteps(steps));
}
