import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  deleteAttachmentRow,
  insertAttachment,
  referencedPaths,
} from "../db/queries/attachments";
import { ulid } from "./id";

const ROOT = "attachments";
const THUMBS = `${ROOT}/thumbs`;
const MAX_EDGE = 1600;
const THUMB_EDGE = 320;

/**
 * SDK 57 object API. `Paths.document` survives restarts; `Paths.cache` does not.
 * Created lazily so a user who never attaches anything never gets the folder.
 */
function dir(relative: string) {
  const directory = new Directory(Paths.document, relative);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/**
 * Stored paths are relative to the document directory; resolve at read time.
 * iOS changes the absolute container path on app updates, so an absolute URI in
 * SQLite is a bug that only shows up after your next release.
 */
export function resolveAttachmentUri(relative: string) {
  return new File(Paths.document, relative).uri;
}

export type AttachSource = "library" | "camera";

async function pick(source: AttachSource) {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    return ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
  }
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
}

/**
 * Pick -> downscale -> thumbnail -> blurhash -> copy into documents -> row.
 * Returns the new attachment id, or null if the user cancelled.
 */
export async function attachImage(
  db: SQLiteDatabase,
  entryId: string,
  source: AttachSource = "library",
) {
  const picked = await pick(source);
  if (!picked || picked.canceled) return null;
  const asset = picked.assets[0];

  // Downscale first: a 12 MP original in a list row is pure waste. Never upscale.
  const main = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_EDGE) main.resize({ width: MAX_EDGE });
  const saved = await (
    await main.renderAsync()
  ).saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  const thumb = await (
    await ImageManipulator.manipulate(saved.uri)
      .resize({ width: THUMB_EDGE })
      .renderAsync()
  ).saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  // Blurhash is a nicety — a failure here must not lose the photo.
  const blurhash = await Image.generateBlurhashAsync(thumb.uri, [4, 3]).catch(
    () => null,
  );

  // The picker and the manipulator both hand back cache URIs. Copy into
  // documents or the file vanishes the next time the OS needs space.
  const id = ulid();
  const filePath = `${ROOT}/${id}.jpg`;
  const thumbPath = `${THUMBS}/${id}.jpg`;
  const target = new File(dir(ROOT), `${id}.jpg`);
  const thumbTarget = new File(dir(THUMBS), `${id}.jpg`);
  await new File(saved.uri).copy(target);
  await new File(thumb.uri).copy(thumbTarget);

  await insertAttachment(db, {
    id,
    entryId,
    file_uri: filePath,
    thumb_uri: thumbPath,
    blurhash,
    mime: "image/jpeg",
    width: saved.width,
    height: saved.height,
    bytes: target.size ?? 0,
  });

  return id;
}

/** Best-effort unlink. A file that is already gone is the state we wanted. */
export function removeFiles(relativePaths: string[]) {
  for (const path of relativePaths) {
    const file = new File(Paths.document, path);
    try {
      if (file.exists) file.delete();
    } catch (cause) {
      console.warn("[journal] could not delete", path, cause);
    }
  }
}

/** Row first, file second — the sweeper cleans up if we die in between. */
export async function removeAttachment(db: SQLiteDatabase, id: string) {
  removeFiles(await deleteAttachmentRow(db, id));
}

/**
 * Deletes every file in the attachments tree that no row references. Run after
 * purges and from Settings; it is the safety net for every crash between "row
 * deleted" and "file deleted".
 */
export async function sweepOrphans(db: SQLiteDatabase) {
  const known = await referencedPaths(db);
  let removed = 0;

  for (const relative of [ROOT, THUMBS]) {
    const directory = new Directory(Paths.document, relative);
    if (!directory.exists) continue;
    for (const item of directory.list()) {
      if (item instanceof File && !known.has(`${relative}/${item.name}`)) {
        item.delete();
        removed++;
      }
    }
  }
  return removed;
}
