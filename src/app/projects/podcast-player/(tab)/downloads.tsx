import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useShallow } from "zustand/react/shallow";

import { SectionHeader } from "@/src/projects/podcast-player/components/common/SectionHeader";
import { StorageBar } from "@/src/projects/podcast-player/components/common/StorageBar";
import { LiveTransferRow } from "@/src/projects/podcast-player/containers/LiveTransferRow";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { MINI_PLAYER_CONTENT_INSET } from "@/src/projects/podcast-player/constants/layout";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import { useEpisodeActions } from "@/src/projects/podcast-player/hooks/useEpisodeActions";
import {
  useDownloads,
  useStorageUsage,
} from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import { useDownloadStore } from "@/src/projects/podcast-player/stores/downloadStore";
import { useSettingsStore } from "@/src/projects/podcast-player/stores/settingsStore";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import { formatBytes } from "@/src/projects/podcast-player/utils/format";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

export default function PodcastDownloadsScreen() {
  const router = useRouter();
  const downloads = useDownloads();
  const storage = useStorageUsage();
  // Only the states (for the transfers / on-device split); byte progress is
  // subscribed per row in LiveTransferRow, so ticks don't re-render the screen.
  const liveStates = useDownloadStore(
    useShallow((s) =>
      Object.fromEntries(
        Object.entries(s.live).map(([id, d]) => [id, d.state]),
      ),
    ),
  );
  const network = useDownloadStore((s) => s.network);
  const autoDeleteDays = useSettingsStore((s) => s.autoDeleteDays);
  const actions = useEpisodeActions();

  const rows = downloads.data ?? [];
  const isDone = ({ record }: (typeof rows)[number]) =>
    (liveStates[record.episodeId] ?? record.state) === "done";
  const transfers = rows.filter((r) => !isDone(r));
  const onDevice = rows.filter(isDone);

  const deletePlayed = () =>
    Alert.alert(
      "Delete all played?",
      "Downloaded episodes you've finished will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void downloadManager.deleteAllPlayed(),
        },
      ],
    );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: MINI_PLAYER_CONTENT_INSET + 16 }}
    >
      {storage.data ? <StorageBar {...storage.data} /> : null}
      <Pressable
        style={styles.setting}
        onPress={() => router.push("/projects/podcast-player/settings")}
      >
        <Text style={styles.settingLabel}>Auto-delete played after</Text>
        <Text style={styles.settingValue}>
          {autoDeleteDays === 0 ? "Never" : `${autoDeleteDays} d`} ›
        </Text>
      </Pressable>
      {network !== "ok" && transfers.length > 0 ? (
        <View style={styles.notice}>
          <Ionicons
            name={network === "offline" ? "cloud-offline" : "wifi"}
            size={16}
            color="#FACC15"
          />
          <Text style={styles.noticeText}>
            {network === "offline"
              ? "Offline — downloads will resume automatically."
              : "Waiting for Wi-Fi (Wi-Fi only is on)."}
          </Text>
        </View>
      ) : null}

      {transfers.length > 0 ? (
        <SectionHeader title={`Downloading (${transfers.length})`} />
      ) : null}
      {transfers.map(({ record, episode }) => (
        <LiveTransferRow
          key={record.episodeId}
          episodeId={record.episodeId}
          fallback={{ state: record.state, bytes: record.bytesWritten }}
          title={episode.title}
          error={record.error}
          attempts={record.attempts}
          onCancel={() => void downloadManager.remove(record.episodeId)}
          onBadgePress={(state) => actions.download(record.episodeId, state)}
        />
      ))}

      <SectionHeader title={`On device (${onDevice.length})`} />
      {onDevice.length === 0 ? (
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="download-outline"
          iconColor={PodcastTheme.textMuted}
          title="No downloads"
          description="Downloaded episodes play offline and appear here."
          titleColor={PodcastTheme.text}
          descriptionColor={PodcastTheme.textMuted}
        />
      ) : null}
      {onDevice.map(({ record, episode }) => (
        <Pressable
          key={record.episodeId}
          style={styles.device}
          onPress={() => actions.play(record.episodeId)}
          onLongPress={() => actions.download(record.episodeId, "done")}
          accessibilityRole="button"
          accessibilityLabel={`Play ${episode.title}`}
        >
          <Artwork
            uri={episode.artworkUrl ?? episode.podcastArtworkUrl}
            size={40}
            title={episode.podcastTitle}
          />
          <Text
            style={[
              styles.title,
              { flex: 1 },
              episode.played && { color: PodcastTheme.textMuted },
            ]}
            numberOfLines={1}
          >
            {episode.title}
          </Text>
          <Text style={styles.meta}>{formatBytes(record.totalBytes)}</Text>
        </Pressable>
      ))}
      {onDevice.length > 0 ? (
        <Pressable
          onPress={deletePlayed}
          style={styles.deleteAll}
          accessibilityRole="button"
        >
          <Text style={styles.deleteText}>Delete all played</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PodcastTheme.background },
  setting: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: PodcastTheme.border,
  },
  settingLabel: { color: PodcastTheme.text },
  settingValue: { color: PodcastTheme.textMuted },
  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  noticeText: { color: "#FACC15", fontSize: 13 },
  title: { color: PodcastTheme.text, fontWeight: "600", flexShrink: 1 },
  meta: { color: PodcastTheme.textMuted, fontSize: 12, flexShrink: 1 },
  device: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteAll: { alignItems: "center", padding: 20 },
  deleteText: { color: PodcastTheme.danger, fontWeight: "600" },
});
