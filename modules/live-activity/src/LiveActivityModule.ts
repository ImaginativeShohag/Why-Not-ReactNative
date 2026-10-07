import { NativeModule, requireOptionalNativeModule } from "expo";

import type {
  LiveActivityEvents,
  WorkoutActivityAttributes,
  WorkoutActivityState,
} from "./LiveActivity.types";

declare class LiveActivityNativeModule extends NativeModule<LiveActivityEvents> {
  /** iOS: ActivityKit available and enabled by the user. Android: always true. */
  isSupported(): boolean;
  start(
    attributes: WorkoutActivityAttributes,
    state: WorkoutActivityState,
  ): Promise<string | null>;
  update(state: WorkoutActivityState): Promise<void>;
  end(
    state: WorkoutActivityState | null,
    dismissImmediately: boolean,
  ): Promise<void>;
  /** An action tapped while JS wasn't listening (app suspended/killed). */
  consumePendingAction(): string | null;
  setWidgetData(json: string): void;
}

/**
 * `requireOptionalNativeModule` returns null in Expo Go, on web and in Jest
 * instead of throwing at import time — the TS wrapper then degrades to no-ops.
 */
export default requireOptionalNativeModule<LiveActivityNativeModule>(
  "LiveActivity",
);
