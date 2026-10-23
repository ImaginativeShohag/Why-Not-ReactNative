import { useCallback } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { usePlayerStore } from "@/src/projects/podcast-player/stores/playerStore";

type Choice = { label: string; destructive?: boolean; run: () => void };

function choose(title: string, choices: Choice[]) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...choices.map((c) => c.label), "Cancel"],
        cancelButtonIndex: choices.length,
        destructiveButtonIndex: choices.findIndex((c) => c.destructive),
      },
      (i) => choices[i]?.run(),
    );
  } else {
    Alert.alert(title, undefined, [
      ...choices.map((c) => ({
        text: c.label,
        style: c.destructive ? ("destructive" as const) : ("default" as const),
        onPress: c.run,
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }
}

/**
 * Screen-level glue for the common episode actions, so every list behaves
 * the same. Rows stay dumb: screens pass these callbacks down.
 */
export function useEpisodeActions() {
  const currentId = usePlayerStore((s) => s.nowPlaying?.episodeId);
  const playing = usePlayerStore((s) => s.status.playing);

  const play = useCallback(
    (episodeId: string) => {
      if (episodeId === currentId) playbackService.toggle();
      else void playbackService.load(episodeId, { autoplay: true });
    },
    [currentId],
  );

  const download = useCallback((episodeId: string, state: DownloadState) => {
    switch (state) {
      case "idle":
        void downloadManager.enqueue(episodeId);
        return;
      case "failed":
        void downloadManager.retry(episodeId);
        return;
      case "queued":
        choose("Queued download", [
          {
            label: "Download first",
            run: () => void downloadManager.prioritize(episodeId),
          },
          {
            label: "Cancel download",
            destructive: true,
            run: () => void downloadManager.remove(episodeId),
          },
        ]);
        return;
      case "downloading":
        choose("Downloading", [
          { label: "Pause", run: () => void downloadManager.pause(episodeId) },
          {
            label: "Cancel download",
            destructive: true,
            run: () => void downloadManager.remove(episodeId),
          },
        ]);
        return;
      case "paused":
        choose("Paused download", [
          {
            label: "Resume",
            run: () => void downloadManager.resume(episodeId),
          },
          {
            label: "Cancel download",
            destructive: true,
            run: () => void downloadManager.remove(episodeId),
          },
        ]);
        return;
      case "done":
        choose("Downloaded", [
          {
            label: "Remove download",
            destructive: true,
            run: () => {
              // If it's playing from this file, move it onto the stream first.
              playbackService.releaseLocalFile(episodeId);
              void downloadManager.remove(episodeId);
            },
          },
        ]);
        return;
    }
  }, []);

  const more = useCallback((episodeId: string, played: boolean) => {
    choose("Episode", [
      { label: "Play next", run: () => playbackService.playNext(episodeId) },
      {
        label: "Add to queue",
        run: () => playbackService.addToQueue(episodeId),
      },
      {
        label: played ? "Mark as unplayed" : "Mark as played",
        run: () => void playbackService.markPlayed(episodeId, !played),
      },
    ]);
  }, []);

  return { currentId, playing, play, download, more };
}
