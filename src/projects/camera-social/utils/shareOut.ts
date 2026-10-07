import * as Clipboard from "expo-clipboard";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

import type { Capture } from "@/src/projects/camera-social/models/Asset";
import { env } from "@/src/shared/constants/env";

/** Dedicated gallery album so we never scatter files across the camera roll. */
export const GALLERY_ALBUM = "Why Not RN";

export const APP_SCHEME = "whynotreactnative";

/**
 * Both link shapes for a post. Every project's links are namespaced under
 * `projects/<slug>` because the launcher owns the root; the https form is
 * `/post/<id>` and needs a root-level rewrite (see the project report).
 */
export function postLinks(id: string) {
  return {
    app: Linking.createURL(`projects/camera-social/post/${id}`, {
      scheme: APP_SCHEME,
    }),
    web: `https://${env.linkDomain}/post/${id}`,
  };
}

export async function shareCapture(
  capture: Pick<Capture, "uri" | "mime" | "caption" | "kind">,
) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device");
  }
  await Sharing.shareAsync(capture.uri, {
    mimeType: capture.mime,
    dialogTitle: capture.caption || "Share",
    UTI: capture.kind === "video" ? "public.movie" : "public.image",
  });
}

export async function shareFile(uri: string, mimeType: string) {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, { mimeType });
}

export async function copyPostLink(id: string) {
  await Clipboard.setStringAsync(postLinks(id).web);
}

/**
 * Put the image itself on the clipboard. The manipulator produces the base64
 * natively from a 1600px copy so a 48MP original never becomes a JS string.
 */
export async function copyImage(
  capture: Pick<Capture, "uri" | "width" | "height">,
) {
  const long = Math.max(capture.width, capture.height);
  let ctx = ImageManipulator.manipulate(capture.uri);
  if (long > 1600) {
    ctx = ctx.resize(
      capture.width >= capture.height ? { width: 1600 } : { height: 1600 },
    );
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.85,
    base64: true,
  });
  image.release();
  ctx.release();
  if (!saved.base64) throw new Error("Could not encode image");
  await Clipboard.setImageAsync(saved.base64);
}

/**
 * Save into the dedicated album. Write-only permission is enough (and on iOS
 * a much less scary prompt than full library read access).
 */
export async function saveToGallery(uri: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error("Allow photo library access to save to your gallery");
  }
  const album = await MediaLibrary.Album.get(GALLERY_ALBUM);
  if (album) {
    await MediaLibrary.Asset.create(uri, album);
    return;
  }
  const asset = await MediaLibrary.Asset.create(uri);
  await MediaLibrary.Album.create(GALLERY_ALBUM, [asset]);
}
