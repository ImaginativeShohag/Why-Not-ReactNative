import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";

import { listEntries } from "../db/queries/entries";
import { toJson, toMarkdownDocument } from "./exportFormat";

export type ExportFormat = "json" | "md";

export async function exportEntries(db: SQLiteDatabase, format: ExportFormat) {
  const entries = await listEntries(db, { limit: 100_000 });
  const stamp = new Date().toISOString().slice(0, 10);

  // Cache, not documents: an export is disposable once it has been shared.
  const file = new File(Paths.cache, `journal-${stamp}.${format}`);
  if (file.exists) file.delete();
  file.create();
  file.write(format === "json" ? toJson(entries) : toMarkdownDocument(entries));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: format === "json" ? "application/json" : "text/markdown",
      dialogTitle: "Export journal",
      UTI: format === "json" ? "public.json" : "net.daringfireball.markdown",
    });
  }

  return { uri: file.uri, count: entries.length };
}
