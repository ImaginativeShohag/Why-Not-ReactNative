import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";

import { purgeDeleted, softDeleteAll } from "../db/queries/entries";
import { rebuildSearchIndex } from "../db/migrations";
import { discardDeadLetters, retryDeadLetters } from "../db/queries/outbox";
import { benchmarkSearch } from "../db/queries/search";
import { pruneUnusedTags } from "../db/queries/tags";
import { seedEntries } from "../db/seed";
import { kick } from "../sync/syncEngine";
import { removeFiles, sweepOrphans } from "../utils/attachments";
import { exportEntries, type ExportFormat } from "../utils/export";

/**
 * The Settings screen's maintenance verbs, bound to the provider's db handle.
 * Screens call these; they never import db/ or utils/ that touch the db.
 */
export function useJournalActions() {
  const db = useSQLiteContext();

  return useMemo(
    () => ({
      exportAs: (format: ExportFormat) => exportEntries(db, format),

      /** Hard-delete tombstones, unlink their files, then sweep leftovers. */
      purge: async (includeUnsynced: boolean) => {
        const { purged, files } = await purgeDeleted(db, { includeUnsynced });
        removeFiles(files);
        const orphans = await sweepOrphans(db);
        await pruneUnusedTags(db);
        return { purged, orphans };
      },

      sweepOrphans: () => sweepOrphans(db),

      deleteAll: async (purgeNow: boolean) => {
        const count = await softDeleteAll(db);
        if (purgeNow) {
          const { files } = await purgeDeleted(db, { includeUnsynced: true });
          removeFiles(files);
          await sweepOrphans(db);
          await pruneUnusedTags(db);
        } else {
          void kick();
        }
        return count;
      },

      retryDeadLetters: async () => {
        await retryDeadLetters(db);
        return kick();
      },
      discardDeadLetters: () => discardDeadLetters(db),

      seed: (count: number) => seedEntries(db, count),
      benchmark: (text: string) => benchmarkSearch(db, text),
      rebuildSearchIndex: () => rebuildSearchIndex(db),
    }),
    [db],
  );
}
