import * as MediaLibrary from "expo-media-library";
import type { SQLiteDatabase } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  ingestPhoto,
  ingestVideo,
} from "@/src/projects/camera-social/media/ingest";
import {
  extensionOf,
  libraryGridUri,
  mimeForExtension,
} from "@/src/projects/camera-social/media/paths";
import type {
  LibraryAlbum,
  LibraryAsset,
} from "@/src/projects/camera-social/models/Asset";

const PAGE_SIZE = 90;

/**
 * Resolving the real file per cell would be one native round-trip — and on
 * iOS possibly an iCloud download — per thumbnail, so the grid uses a
 * PhotoKit / content:// URI built from the id instead.
 */
function toLibraryAsset(m: MediaLibrary.AssetMetadata): LibraryAsset | null {
  if (
    m.mediaType !== MediaLibrary.MediaType.IMAGE &&
    m.mediaType !== MediaLibrary.MediaType.VIDEO
  ) {
    return null;
  }
  return {
    id: m.id,
    uri: libraryGridUri(m.id, Platform.OS),
    mediaType: m.mediaType === MediaLibrary.MediaType.VIDEO ? "video" : "photo",
    width: m.width ?? 0,
    height: m.height ?? 0,
    durationSec: m.duration != null ? m.duration / 1000 : null,
    creationTime: m.creationTime,
    filename: m.filename ?? "",
  };
}

/**
 * Paginated media-library reads (offset-based `Query` from the SDK 57 API)
 * with album filtering, iOS limited-access detection and change tracking.
 */
export function useAssets() {
  const [permission, requestPermission, getPermission] =
    MediaLibrary.usePermissions();
  const [albums, setAlbums] = useState<LibraryAlbum[]>([]);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs guard against overlapping onEndReached calls and stale album pages.
  const offset = useRef(0);
  const inFlight = useRef(false);
  const generation = useRef(0);

  const granted = permission?.granted ?? false;
  const limited = permission?.accessPrivileges === "limited";

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!granted || inFlight.current) return;
      inFlight.current = true;
      const gen = reset ? ++generation.current : generation.current;
      if (reset) offset.current = 0;
      setLoading(true);
      try {
        let query = new MediaLibrary.Query()
          .within(MediaLibrary.AssetField.MEDIA_TYPE, [
            MediaLibrary.MediaType.IMAGE,
            MediaLibrary.MediaType.VIDEO,
          ])
          .orderBy({
            key: MediaLibrary.AssetField.CREATION_TIME,
            ascending: false,
          })
          .limit(PAGE_SIZE)
          .offset(offset.current);
        if (albumId) query = query.album(new MediaLibrary.Album(albumId));
        const page = await query.exeForMetadata();
        if (gen !== generation.current) return;
        const mapped = page
          .map(toLibraryAsset)
          .filter((a): a is LibraryAsset => a !== null);
        offset.current += page.length;
        setAssets((prev) => (reset ? mapped : [...prev, ...mapped]));
        setHasMore(page.length === PAGE_SIZE);
        setError(null);
      } catch (e) {
        if (gen !== generation.current) return;
        setError(e instanceof Error ? e.message : "Could not read library");
      } finally {
        // A superseded request must not clear the newer one's flags, or a
        // second loadMore could start while the reset page is still loading.
        if (gen === generation.current) {
          inFlight.current = false;
          setLoading(false);
        }
      }
    },
    [albumId, granted],
  );

  const loadMore = useCallback(() => {
    if (hasMore) void fetchPage(false);
  }, [fetchPage, hasMore]);

  const refresh = useCallback(() => {
    inFlight.current = false;
    void fetchPage(true);
  }, [fetchPage]);

  // First page, and again whenever the album filter changes.
  useEffect(() => {
    if (!granted) return;
    inFlight.current = false;
    void fetchPage(true);
  }, [fetchPage, granted]);

  useEffect(() => {
    if (!granted) return;
    let cancelled = false;
    MediaLibrary.Album.getAll()
      .then((all) =>
        Promise.all(
          all.map(async (a) => ({ id: a.id, title: await a.getTitle() })),
        ),
      )
      .then((list) => {
        if (!cancelled) {
          setAlbums(list.sort((a, b) => a.title.localeCompare(b.title)));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [granted]);

  // Library edits elsewhere (or a limited-selection change) invalidate offsets.
  useEffect(() => {
    if (!granted) return;
    const sub = MediaLibrary.addListener(() => refresh());
    return () => sub.remove();
  }, [granted, refresh]);

  const manageLimitedAccess = useCallback(async () => {
    try {
      await MediaLibrary.presentPermissionsPicker();
    } finally {
      refresh();
    }
  }, [refresh]);

  return {
    permission,
    requestPermission,
    getPermission,
    granted,
    limited,
    albums,
    albumId,
    setAlbumId,
    assets,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    manageLimitedAccess,
  };
}

/**
 * Resolve a library asset to a real file (+EXIF) for import. On iOS this may
 * download the original from iCloud, so only call it on explicit user action.
 */
export async function resolveLibraryAsset(id: string) {
  const asset = new MediaLibrary.Asset(id);
  const [info, exif] = await Promise.all([
    asset.getInfo(),
    asset.getExif().catch(() => ({})),
  ]);
  return { info, exif: exif as Record<string, unknown> };
}

/** Copy a library asset into the app (non-destructive) and return its capture id. */
export async function importLibraryAsset(db: SQLiteDatabase, id: string) {
  const { info, exif } = await resolveLibraryAsset(id);
  const mime = mimeForExtension(extensionOf(info.filename || info.uri));
  if (info.mediaType === MediaLibrary.MediaType.VIDEO) {
    return ingestVideo(db, {
      uri: info.uri,
      durationMs: info.duration,
      mime: mime === "application/octet-stream" ? undefined : mime,
      origin: "library",
    });
  }
  return ingestPhoto(db, {
    uri: info.uri,
    width: info.width,
    height: info.height,
    exif,
    mime: mime === "application/octet-stream" ? undefined : mime,
    origin: "library",
  });
}
