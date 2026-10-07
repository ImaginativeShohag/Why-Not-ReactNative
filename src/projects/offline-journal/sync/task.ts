import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { kick } from "./syncEngine";

export const SYNC_TASK = "offline-journal-sync";

// MODULE SCOPE. The OS relaunches your app headless and looks for a task with
// this name at import time — define it inside a component and it never runs.
if (!TaskManager.isTaskDefined(SYNC_TASK)) {
  TaskManager.defineTask(SYNC_TASK, async () => {
    const startedAt = new Date().toISOString();
    try {
      const result = await kick();
      // Log every invocation: the point is to see how rarely iOS actually runs it.
      console.log("[journal] background sync", startedAt, result);
      return result.error
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success;
    } catch (cause) {
      console.warn("[journal] background sync failed", startedAt, cause);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerSyncTask() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    if (await TaskManager.isTaskRegisteredAsync(SYNC_TASK)) return true;

    // Minutes, and a *hint*. iOS may run it hours later, or never. The app must
    // be fully correct if this never fires once.
    await BackgroundTask.registerTaskAsync(SYNC_TASK, { minimumInterval: 15 });
    return true;
  } catch (cause) {
    // Expo Go and the web have no background execution; not an error for us.
    console.warn("[journal] background task unavailable", cause);
    return false;
  }
}

export async function unregisterSyncTask() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(SYNC_TASK))
      await BackgroundTask.unregisterTaskAsync(SYNC_TASK);
  } catch {
    // Nothing registered, nothing to undo.
  }
}
