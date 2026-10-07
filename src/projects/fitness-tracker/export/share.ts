import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { Point, Workout } from "../models/Workout";
import { toGpx } from "./gpx";

const safeName = (s: string) => s.replace(/[^\w-]+/g, "_").slice(0, 60);

export async function shareGpx(workout: Workout, points: readonly Point[]) {
  const file = new File(
    Paths.cache,
    `${safeName(workout.title)}-${workout.id}.gpx`,
  );
  if (file.exists) file.delete();
  file.create();
  file.write(
    toGpx(
      {
        title: workout.title,
        type: workout.type,
        startedAt: workout.startedAt,
      },
      points,
    ),
  );
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/gpx+xml",
    UTI: "com.topografix.gpx",
    dialogTitle: "Export GPX",
  });
}

/** Writes a base64 PNG (from Skia's offscreen render) and opens the share sheet. */
export async function sharePng(base64: string, name: string) {
  const file = new File(Paths.cache, `${safeName(name)}.png`);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: "base64" });
  await Sharing.shareAsync(file.uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Share workout",
  });
}
