import { getDb } from "../db/client";
import { getPrefs } from "../db/queries/prefs";
import { activeDays, dailyTotals } from "../db/queries/workouts";
import * as liveActivity from "../liveactivity";
import { startOfDay } from "../utils/dates";
import { computeStreak } from "../utils/streak";

const STEP_BUCKET = 100;
const STEP_DEBOUNCE_MS = 2000;

let lastSteps = 0;
let lastBucket: number | null = null;
let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Mirrors today's numbers into the App Group / SharedPreferences. Widget
 * timelines have a daily reload budget, so this owns the throttling:
 * - with `steps` (the Today screen, on every pedometer tick) it only pushes
 *   once steps cross a 100-step bucket, debounced by 2 s;
 * - without (a workout just finished) it pushes immediately.
 * Never on a timer. Best effort: never rejects.
 */
export async function syncWidget(steps?: number) {
  if (steps != null) {
    lastSteps = steps;
    const bucket = Math.floor(steps / STEP_BUCKET);
    if (bucket === lastBucket) return;
    lastBucket = bucket;
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      push();
    }, STEP_DEBOUNCE_MS);
    return;
  }
  if (pending) clearTimeout(pending);
  pending = null;
  await push();
}

async function push() {
  try {
    const db = await getDb();
    const today = startOfDay(Date.now());
    const [totals, days, prefs] = await Promise.all([
      dailyTotals(db, today),
      activeDays(db),
      getPrefs(db),
    ]);
    liveActivity.setWidgetData({
      steps: lastSteps,
      stepGoal: prefs.dailyStepGoal,
      distanceM: totals.reduce((sum, d) => sum + d.distanceM, 0),
      distanceGoalM: prefs.dailyDistanceGoalKm * 1000,
      streakDays: computeStreak(days, new Date()),
      updatedAt: Date.now(),
    });
  } catch {
    // The widget just keeps its previous numbers.
  }
}
