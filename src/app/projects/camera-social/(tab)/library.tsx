import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionGate } from "@/src/projects/camera-social/components/PermissionGate";
import { AlbumPickerSheet } from "@/src/projects/camera-social/components/library/AlbumPickerSheet";
import { AssetGrid } from "@/src/projects/camera-social/components/library/AssetGrid";
import { LimitedAccessBanner } from "@/src/projects/camera-social/components/library/LimitedAccessBanner";
import { SelectionBar } from "@/src/projects/camera-social/components/library/SelectionBar";
import { Palette } from "@/src/projects/camera-social/constants/theme";
import {
  importLibraryAsset,
  resolveLibraryAsset,
  useAssets,
} from "@/src/projects/camera-social/hooks/useAssets";
import {
  mimeForExtension,
  extensionOf,
} from "@/src/projects/camera-social/media/paths";
import { alertError } from "@/src/projects/camera-social/utils/alertError";
import { shareFile } from "@/src/projects/camera-social/utils/shareOut";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useSQLiteContext();
  const library = useAssets();

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const albumTitle =
    library.albums.find((a) => a.id === library.albumId)?.title ?? "Recents";

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const endSelection = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      alertError("Something went wrong", e);
    } finally {
      setBusy(false);
    }
  };

  const editAsset = (id: string) =>
    run(async () => {
      const captureId = await importLibraryAsset(db, id);
      endSelection();
      router.push(`/projects/camera-social/editor/${captureId}`);
    });

  const importAssets = (ids: string[]) =>
    run(async () => {
      for (const id of ids) await importLibraryAsset(db, id);
      endSelection();
      router.navigate("/projects/camera-social");
    });

  const shareAssets = (ids: string[]) =>
    run(async () => {
      // The system sheet takes one file at a time; present them in sequence.
      for (const id of ids) {
        const { info } = await resolveLibraryAsset(id);
        await shareFile(
          info.uri,
          mimeForExtension(extensionOf(info.filename || info.uri)),
        );
      }
    });

  const showAssetActions = (id: string) => {
    const options = ["Edit", "Add to feed", "Share", "Cancel"];
    const handle = (index: number) => {
      if (index === 0) void editAsset(id);
      if (index === 1) void importAssets([id]);
      if (index === 2) void shareAssets([id]);
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, userInterfaceStyle: "dark" },
        handle,
      );
    } else {
      Alert.alert("Photo", undefined, [
        { text: "Edit", onPress: () => handle(0) },
        { text: "Add to feed", onPress: () => handle(1) },
        { text: "Share", onPress: () => handle(2) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const onPressAsset = (id: string) => {
    if (selecting) toggle(id);
    else showAssetActions(id);
  };

  const onLongPressAsset = (id: string) => {
    setSelecting(true);
    setSelected((prev) => new Set(prev).add(id));
  };

  const ids = [...selected];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <View style={styles.headerRight}>
          {library.granted ? (
            <Pressable
              onPress={() => setAlbumsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Album: ${albumTitle}`}
              style={styles.albumButton}
            >
              <Text style={styles.albumText} numberOfLines={1}>
                {albumTitle}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Palette.text} />
            </Pressable>
          ) : null}
          {library.granted ? (
            <Pressable
              onPress={() => (selecting ? endSelection() : setSelecting(true))}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.selectText}>
                {selecting ? "Cancel" : "Select"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <PermissionGate
        status={library.permission}
        onRequest={library.requestPermission}
        onRecheck={library.getPermission}
        icon="images"
        title="Photo library"
        rationale="Browse your albums to edit and share photos. You can allow access to only selected photos."
        settingsHint="Photo access is turned off. Turn it on in Settings to browse your library."
      >
        {library.limited ? (
          <LimitedAccessBanner
            onManage={() => void library.manageLimitedAccess()}
          />
        ) : null}
        {library.error ? (
          <Text style={styles.error}>{library.error}</Text>
        ) : null}
        {!library.loading && library.assets.length === 0 ? (
          <ContentUnavailableView
            iconComponent={Ionicons}
            iconName="images-outline"
            iconColor={Palette.textMuted}
            title={
              library.limited
                ? "No photos shared with this app yet."
                : "No photos or videos here."
            }
            titleColor={Palette.text}
          />
        ) : (
          <AssetGrid
            assets={library.assets}
            selectedIds={selected}
            selecting={selecting}
            loadingMore={library.loading && library.assets.length > 0}
            onEndReached={library.loadMore}
            onPressAsset={onPressAsset}
            onLongPressAsset={onLongPressAsset}
            bottomInset={selecting ? 90 : 16}
          />
        )}
      </PermissionGate>

      {selecting ? (
        <SelectionBar
          count={ids.length}
          busy={busy}
          bottomInset={12}
          actions={[
            {
              label: "Add",
              onPress: () => void importAssets(ids),
              disabled: ids.length === 0,
            },
            {
              label: "Edit",
              onPress: () => void editAsset(ids[0]),
              disabled: ids.length !== 1,
            },
            {
              label: "Share",
              onPress: () => void shareAssets(ids),
              disabled: ids.length === 0,
            },
          ]}
        />
      ) : null}

      <AlbumPickerSheet
        visible={albumsOpen}
        albums={library.albums}
        selectedId={library.albumId}
        onSelect={(id) => {
          library.setAlbumId(id);
          setAlbumsOpen(false);
        }}
        onClose={() => setAlbumsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: { color: Palette.text, fontSize: 28, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  albumButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 160,
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  albumText: { color: Palette.text, fontWeight: "600" },
  selectText: { color: Palette.accent, fontWeight: "700", fontSize: 16 },
  error: { color: Palette.danger, padding: 12 },
});
