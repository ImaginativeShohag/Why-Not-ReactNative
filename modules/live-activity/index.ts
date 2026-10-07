import type { EventSubscription } from "expo-modules-core";

import type {
  LiveActivityAction,
  LiveActivityActionEvent,
  WidgetData,
  WorkoutActivityAttributes,
  WorkoutActivityState,
} from "./src/LiveActivity.types";
import LiveActivityModule from "./src/LiveActivityModule";

export * from "./src/LiveActivity.types";

/**
 * One interface, two very different implementations: an ActivityKit Live
 * Activity (+ Dynamic Island) on iOS, an ongoing notification with actions on
 * Android. Every function is a safe no-op when the native module is absent.
 */
export function isAvailable(): boolean {
  return LiveActivityModule?.isSupported() ?? false;
}

export async function startLiveActivity(
  attributes: WorkoutActivityAttributes,
  state: WorkoutActivityState,
): Promise<string | null> {
  if (!LiveActivityModule) return null;
  return LiveActivityModule.start(attributes, state);
}

export async function updateLiveActivity(
  state: WorkoutActivityState,
): Promise<void> {
  await LiveActivityModule?.update(state);
}

export async function endLiveActivity(
  finalState: WorkoutActivityState | null = null,
  dismissImmediately = false,
): Promise<void> {
  await LiveActivityModule?.end(finalState, dismissImmediately);
}

export function addActionListener(
  listener: (event: LiveActivityActionEvent) => void,
): EventSubscription {
  if (!LiveActivityModule) return { remove() {} };
  return LiveActivityModule.addListener("onAction", listener);
}

const ACTIONS: readonly LiveActivityAction[] = ["pause", "resume", "end"];

export function consumePendingAction(): LiveActivityAction | null {
  const action = LiveActivityModule?.consumePendingAction() ?? null;
  return ACTIONS.includes(action as LiveActivityAction)
    ? (action as LiveActivityAction)
    : null;
}

export function setWidgetData(data: WidgetData): void {
  LiveActivityModule?.setWidgetData(JSON.stringify(data));
}
