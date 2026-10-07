import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import { refreshSubscriptions } from "@/src/projects/podcast-player/feeds/sync";
import { ensureSettingsHydrated } from "@/src/projects/podcast-player/stores/settingsStore";

/**
 * Periodic background refresh (expo-background-task: BGTaskScheduler on iOS,
 * WorkManager on Android). It refreshes feeds, which may queue auto-downloads,
 * then asks the download manager to start whatever is queued.
 *
 * It lives under downloads/ because its main job is feeding the download
 * queue, but it is NOT a background-transfer service. The OS gives it a short
 * window and decides when (and whether) to run it. Transfers it starts are
 * ordinary `DownloadTask`s: on iOS the native URLSession may keep going while
 * the app is suspended, but if the process dies the JS side (promise, DB row)
 * is gone, and the manager's snapshot + rehydrate path picks it up on the next
 * launch. On Android the transfer stops with the process.
 *
 * defineTask MUST run at module scope when the JS bundle loads, including a
 * headless background launch where no screen mounts. That is why the root
 * `src/app/_layout.tsx` imports this module, not just the project layout.
 */
export const PODCAST_BACKGROUND_TASK = "podcast-player/background-refresh";

// Guarded so fast refresh / a second import doesn't redefine it.
if (!TaskManager.isTaskDefined(PODCAST_BACKGROUND_TASK)) {
  TaskManager.defineTask(PODCAST_BACKGROUND_TASK, async () => {
    try {
      // Headless launch: nothing has awaited the AsyncStorage-backed settings
      // yet, and getSettings() would return DEFAULT_SETTINGS (Wi-Fi only, the
      // default cap and concurrency) instead of the user's choices.
      await ensureSettingsHydrated();
      await refreshSubscriptions();
      await downloadManager.kick();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Called from the podcast project layout, not the root. The registration
 * persists across launches, so once the user has opened the project, headless
 * runs work without the layout. Registering from the root would be cheap and
 * permission-free, but it would wake the app periodically to open the podcast
 * database and run the download manager for people who never used this
 * project. User-facing setup waits until the project is opened.
 */
export async function registerBackgroundTask(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(PODCAST_BACKGROUND_TASK))
      return;
    // The OS treats this as a hint; iOS decides the real cadence.
    await BackgroundTask.registerTaskAsync(PODCAST_BACKGROUND_TASK, {
      minimumInterval: 60,
    });
  } catch {
    // Expo Go / simulators without BGTaskScheduler support.
  }
}
