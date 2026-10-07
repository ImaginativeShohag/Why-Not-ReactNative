import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { IconButton } from "@/src/projects/camera-social/components/common/IconButton";
import { TrimFilmstrip } from "@/src/projects/camera-social/components/editor/TrimFilmstrip";
import { Palette, Spacing } from "@/src/projects/camera-social/constants/theme";
import { createFilmstrip } from "@/src/projects/camera-social/media/thumbnails";

type Props = {
  uri: string;
  /** Known duration; if null it's read from the player once loaded. */
  durationMs: number | null;
  initialStartMs: number | null;
  initialEndMs: number | null;
  onRangeChange: (startMs: number, endMs: number) => void;
};

const FRAME_COUNT = 10;

/**
 * Preview player + scrubbable filmstrip. Playback loops inside the selected
 * range so what you hear is what the trimmed post will play.
 */
export function VideoTrimEditor({
  uri,
  durationMs: knownDuration,
  initialStartMs,
  initialEndMs,
  onRangeChange,
}: Props) {
  const [durationMs, setDurationMs] = useState<number | null>(knownDuration);
  // User's selection; until they drag, the range derives from the props.
  const [picked, setPicked] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [positionMs, setPositionMs] = useState(initialStartMs ?? 0);
  const [frames, setFrames] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);

  const range =
    picked ??
    (durationMs
      ? {
          start: Math.min(initialStartMs ?? 0, durationMs),
          end: Math.min(initialEndMs ?? durationMs, durationMs),
        }
      : null);

  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 0.1;
    p.currentTime = (initialStartMs ?? 0) / 1000;
  });

  // Seek through the method: the React Compiler forbids assigning to a value
  // returned by a hook (`player.currentTime = …`).
  const seekTo = (ms: number) => player.seekBy(ms / 1000 - player.currentTime);

  useEventListener(player, "sourceLoad", ({ duration }) => {
    if (!durationMs && duration > 0) setDurationMs(Math.round(duration * 1000));
  });
  useEventListener(player, "playingChange", ({ isPlaying }) =>
    setPlaying(isPlaying),
  );
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const ms = currentTime * 1000;
    setPositionMs(ms);
    if (range && ms >= range.end) seekTo(range.start);
  });

  // Filmstrip frames are cache-only; regenerated each time the trim opens.
  useEffect(() => {
    if (!durationMs) return;
    let cancelled = false;
    createFilmstrip(uri, durationMs, FRAME_COUNT)
      .then((f) => !cancelled && setFrames(f))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [uri, durationMs]);

  const togglePlay = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (range && (positionMs < range.start || positionMs >= range.end - 50)) {
      seekTo(range.start);
    }
    player.play();
  };

  return (
    <View style={styles.fill}>
      <View style={styles.video}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
        />
      </View>
      <View style={styles.controls}>
        <IconButton
          icon={playing ? "pause" : "play"}
          size={30}
          onPress={togglePlay}
          accessibilityLabel={playing ? "Pause" : "Play"}
        />
      </View>
      {durationMs && range ? (
        <TrimFilmstrip
          frames={frames}
          durationMs={durationMs}
          startMs={range.start}
          endMs={range.end}
          positionMs={positionMs}
          onScrub={(ms) => {
            player.pause();
            seekTo(ms);
            setPositionMs(ms);
          }}
          onChange={(start, end) => {
            setPicked({ start, end });
            onRangeChange(start, end);
          }}
        />
      ) : (
        <ActivityIndicator color={Palette.text} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: Spacing.md },
  video: { flex: 1, backgroundColor: "#000" },
  controls: { alignItems: "center" },
});
