import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Palette, Spacing } from "@/src/projects/camera-social/constants/theme";
import {
  useInboundShare,
  type InboundFile,
} from "@/src/projects/camera-social/hooks/useInboundShare";
import { alertError } from "@/src/projects/camera-social/utils/alertError";
import {
  formatBytes,
  formatDuration,
} from "@/src/projects/camera-social/utils/format";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

/**
 * Where media shared from other apps (Photos → Share → this app) lands. The
 * files still live in the share extension's container, so nothing is ours
 * until the user imports — which copies them into the app's media folder.
 */
export default function ShareInboundScreen() {
  const insets = useSafeAreaInsets();
  const share = useInboundShare();
  const [busy, setBusy] = useState(false);

  const finish = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
      // Clear the intent so re-entering the project doesn't re-open this screen.
      share.reset();
    } catch (e) {
      alertError("Couldn't import", e);
    } finally {
      setBusy(false);
    }
  };

  const addToFeed = () =>
    finish(async () => {
      await share.importAll();
      router.dismissTo("/projects/camera-social");
    });

  const editFirst = (file: InboundFile) =>
    finish(async () => {
      const id = await share.importFile(file);
      router.replace(`/projects/camera-social/editor/${id}`);
    });

  const discard = () => {
    share.reset();
    router.back();
  };

  if (!share.isReady) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={Palette.text} />
      </View>
    );
  }

  if (share.files.length === 0) {
    return (
      <View style={styles.screen}>
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="share-outline"
          iconColor={Palette.textMuted}
          title={share.text ? "Shared text" : "Nothing shared yet"}
          description={
            share.text ??
            share.error ??
            "Share a photo or video from another app and choose Why-Not-ReactNative."
          }
          titleColor={Palette.text}
          descriptionColor={Palette.textMuted}
        />
      </View>
    );
  }

  const single = share.files.length === 1 ? share.files[0] : null;

  return (
    <View style={styles.screen}>
      <FlatList
        data={share.files}
        keyExtractor={(f) => f.key}
        numColumns={single ? 1 : 3}
        key={single ? "single" : "grid"}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <InboundCell file={item} large={single !== null} />
        )}
        ListHeaderComponent={
          <Text style={styles.heading}>
            {share.files.length === 1
              ? "1 item shared with you"
              : `${share.files.length} items shared with you`}
          </Text>
        }
      />
      <View
        style={[styles.actions, { paddingBottom: insets.bottom + Spacing.md }]}
      >
        <Pressable
          onPress={discard}
          disabled={busy}
          style={styles.secondary}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Discard</Text>
        </Pressable>
        {single?.kind === "photo" ? (
          <Pressable
            onPress={() => editFirst(single)}
            disabled={busy}
            style={styles.secondary}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Edit</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={addToFeed}
          disabled={busy}
          style={styles.primary}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryText}>Add to feed</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function InboundCell({ file, large }: { file: InboundFile; large: boolean }) {
  const aspect =
    file.width && file.height ? file.width / file.height : large ? 4 / 3 : 1;
  return (
    <View style={[styles.cell, large ? { aspectRatio: aspect } : styles.small]}>
      {file.kind === "photo" ? (
        <Image
          source={{ uri: file.uri }}
          contentFit={large ? "contain" : "cover"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.videoPlaceholder]}>
          <Ionicons name="videocam" size={28} color={Palette.textMuted} />
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {file.kind === "video" && file.durationMs != null
            ? `▶ ${formatDuration(file.durationMs / 1000)}`
            : file.fileName}
          {file.size ? ` · ${formatBytes(file.size)}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  centered: { alignItems: "center", justifyContent: "center" },
  grid: { padding: Spacing.sm, gap: Spacing.sm },
  heading: {
    color: Palette.textMuted,
    fontWeight: "600",
    marginVertical: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  cell: {
    backgroundColor: Palette.surface,
    borderRadius: 10,
    overflow: "hidden",
    margin: 2,
  },
  small: { flex: 1 / 3, aspectRatio: 1 },
  videoPlaceholder: { alignItems: "center", justifyContent: "center" },
  meta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 6,
    backgroundColor: Palette.scrim,
  },
  metaText: { color: Palette.text, fontSize: 11, fontWeight: "600" },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
  secondary: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: Palette.text, fontWeight: "700" },
  primary: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#000", fontWeight: "800", fontSize: 16 },
});
