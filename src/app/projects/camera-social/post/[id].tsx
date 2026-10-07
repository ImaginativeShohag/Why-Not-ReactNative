import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/src/projects/camera-social/components/common/IconButton";
import { DismissibleContainer } from "@/src/projects/camera-social/components/viewer/DismissibleContainer";
import { PostActionBar } from "@/src/projects/camera-social/components/viewer/PostActionBar";
import { PostInfoPanel } from "@/src/projects/camera-social/components/viewer/PostInfoPanel";
import { TrimmedVideoView } from "@/src/projects/camera-social/components/viewer/TrimmedVideoView";
import { ZoomableImage } from "@/src/projects/camera-social/components/viewer/ZoomableImage";
import { Palette } from "@/src/projects/camera-social/constants/theme";
import {
  setCaption,
  setFavorite,
  type CapturePage,
} from "@/src/projects/camera-social/db/captures";
import { useCapturePages } from "@/src/projects/camera-social/hooks/useCaptures";
import { summarizeExif } from "@/src/projects/camera-social/media/exif";
import { removeCapture } from "@/src/projects/camera-social/media/ingest";
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatFormat,
} from "@/src/projects/camera-social/utils/format";
import { alertError } from "@/src/projects/camera-social/utils/alertError";
import { supportsZoomTransition } from "@/src/projects/camera-social/utils/platform";
import {
  copyImage,
  copyPostLink,
  saveToGallery,
  shareCapture,
} from "@/src/projects/camera-social/utils/shareOut";

/** Info panel + action bar height — the media page gets the rest. */
const CHROME_HEIGHT = 190;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { captures, loading } = useCapturePages();

  // The page the user is on. Starts at the deep-linked id and follows paging.
  const [currentId, setCurrentId] = useState(id);
  const [zoomed, setZoomed] = useState(false);

  const initialIndex = Math.max(
    0,
    captures.findIndex((c) => c.id === id),
  );
  const current = captures.find((c) => c.id === currentId) ?? null;

  const viewport = {
    width,
    height: height - insets.top - insets.bottom - CHROME_HEIGHT - 44,
  };

  const close = useCallback(() => {
    // Cold start from a deep link has nothing underneath — land on the feed.
    if (router.canGoBack()) router.back();
    else router.replace("/projects/camera-social");
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<CapturePage>[] }) => {
      const first = viewableItems[0]?.item;
      if (first) {
        setCurrentId(first.id);
        setZoomed(false);
      }
    },
    [],
  );

  const run = async (task: () => Promise<unknown>, success?: string) => {
    try {
      await task();
      if (success) Alert.alert(success);
    } catch (e) {
      alertError("Something went wrong", e);
    }
  };

  const confirmDelete = (capture: CapturePage) =>
    Alert.alert("Delete capture?", "This removes it from the app.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(async () => {
            const others = captures.filter((c) => c.id !== capture.id);
            await removeCapture(db, capture.id);
            if (others.length === 0) close();
          }),
      },
    ]);

  const showMore = (capture: CapturePage) => {
    const actions: { label: string; run: () => void; destructive?: boolean }[] =
      [
        {
          label: "Copy link",
          run: () => run(() => copyPostLink(capture.id), "Link copied"),
        },
        ...(capture.kind === "photo"
          ? [
              {
                label: "Copy image",
                run: () => run(() => copyImage(capture), "Image copied"),
              },
            ]
          : []),
        {
          label: "Save to gallery",
          run: () => run(() => saveToGallery(capture.uri), "Saved to gallery"),
        },
        {
          label: "Delete",
          destructive: true,
          run: () => confirmDelete(capture),
        },
      ];

    if (Platform.OS === "ios") {
      const options = [...actions.map((a) => a.label), "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
          userInterfaceStyle: "dark",
        },
        (index) => actions[index]?.run(),
      );
    } else {
      Alert.alert("Capture", undefined, [
        ...actions.map((a) => ({
          text: a.label,
          style: a.destructive ? ("destructive" as const) : undefined,
          onPress: a.run,
        })),
        { text: "Cancel", style: "cancel" as const },
      ]);
    }
  };

  const renderPage = ({ item }: { item: CapturePage }) => (
    <View style={{ width, height: viewport.height }}>
      {item.kind === "video" ? (
        <TrimmedVideoView
          uri={item.uri}
          active={item.id === currentId}
          trimStartMs={item.trimStartMs}
          trimEndMs={item.trimEndMs}
        />
      ) : (
        <ZoomableImage
          uri={item.uri}
          placeholderUri={item.thumbUri}
          image={{ width: item.width, height: item.height }}
          viewport={viewport}
          recyclingKey={item.id}
          onZoomChange={setZoomed}
        />
      )}
    </View>
  );

  const body = (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-down"
          onPress={close}
          accessibilityLabel="Close"
        />
        <Text style={styles.counter}>
          {captures.length > 1 && current
            ? `${captures.indexOf(current) + 1} / ${captures.length}`
            : ""}
        </Text>
        {current ? (
          <IconButton
            icon="ellipsis-horizontal"
            onPress={() => showMore(current)}
            accessibilityLabel="More actions"
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {!loading && captures.length > 0 ? (
        <FlatList
          data={captures}
          keyExtractor={(c) => c.id}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          // A zoomed image owns horizontal drags; the pager waits.
          scrollEnabled={!zoomed}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          showsHorizontalScrollIndicator={false}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
        />
      ) : (
        <View style={[styles.missing, { height: viewport.height }]}>
          <Text style={styles.missingText}>
            {loading ? "" : "This capture isn't on this device."}
          </Text>
        </View>
      )}

      {current ? (
        <View style={{ paddingBottom: insets.bottom }}>
          <PostInfoPanel
            // Remount per capture so the caption draft never leaks across pages.
            key={current.id}
            caption={current.caption}
            {...infoLabels(current)}
            onCaptionChange={(caption) =>
              void run(() => setCaption(db, current.id, caption))
            }
          />
          <PostActionBar
            favorite={current.favorite}
            editLabel={current.kind === "video" ? "Trim" : "Edit"}
            onFavorite={() =>
              void run(() => setFavorite(db, current.id, !current.favorite))
            }
            onEdit={() =>
              router.push(`/projects/camera-social/editor/${current.id}`)
            }
            onShare={() => void run(() => shareCapture(current))}
            onMore={() => showMore(current)}
          />
        </View>
      ) : null}
    </View>
  );

  // With the native zoom transition iOS supplies the interactive dismissal;
  // everywhere else we provide our own drag-to-dismiss over a transparent modal.
  return supportsZoomTransition ? (
    <View style={[styles.fill, styles.solid]}>{body}</View>
  ) : (
    <DismissibleContainer
      enabled={!zoomed}
      onDismiss={close}
      backdropColor={Palette.background}
    >
      {body}
    </DismissibleContainer>
  );
}

/** Metadata labels for the info panel, derived once per capture. */
function infoLabels(capture: CapturePage) {
  const exif = summarizeExif(capture.exif);
  const specs = [
    `${capture.width}×${capture.height}`,
    formatBytes(capture.bytes),
    formatFormat(capture.mime),
  ];
  if (capture.kind === "video" && capture.durationMs != null) {
    specs.unshift(formatDuration(capture.durationMs / 1000));
  }
  const badges: string[] = [];
  if (capture.origin === "edit") badges.push("Edited");
  if (capture.origin === "share") badges.push("Shared in");
  if (capture.origin === "library") badges.push("From library");
  if (capture.trimStartMs != null || capture.trimEndMs != null) {
    badges.push("Trimmed");
  }
  return {
    dateLabel: formatDateTime(exif.takenAt ?? capture.createdAt),
    specsLabel: specs.join(" · "),
    exposureLabel: exif.exposure,
    cameraLabel: [exif.camera, exif.lens].filter(Boolean).join(" · ") || null,
    badges,
  };
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  solid: { backgroundColor: Palette.background },
  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  headerSpacer: { width: 40 },
  counter: { color: Palette.textMuted, fontSize: 13, fontWeight: "600" },
  missing: { alignItems: "center", justifyContent: "center" },
  missingText: { color: Palette.textMuted },
});
