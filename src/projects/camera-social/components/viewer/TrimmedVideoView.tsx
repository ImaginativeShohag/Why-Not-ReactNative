import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { trimLoopSeek } from "@/src/projects/camera-social/utils/trim";

type Props = {
  uri: string;
  /** Only the visible page plays; the rest stay paused (and silent). */
  active: boolean;
  /** Non-destructive trim: playback loops inside [start, end] (end may be null). */
  trimStartMs?: number | null;
  trimEndMs?: number | null;
  nativeControls?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * expo-video playback that honours the capture's trim window. Trim is stored
 * as metadata rather than re-encoding the file, so the player enforces it.
 */
export function TrimmedVideoView({
  uri,
  active,
  trimStartMs,
  trimEndMs,
  nativeControls = true,
  style,
}: Props) {
  const start = (trimStartMs ?? 0) / 1000;
  const end = trimEndMs != null ? trimEndMs / 1000 : null;

  const player = useVideoPlayer(uri, (p) => {
    // Never native looping: it restarts at 0:00, ignoring the trim start.
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
    p.currentTime = start;
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    // Seek via the method — the React Compiler forbids mutating a hook's
    // return value, and seekBy is the same native call underneath.
    const to = trimLoopSeek(currentTime, start, end);
    if (to != null) player.seekBy(to - currentTime);
  });

  // No end trim: the file's own end is the loop point.
  useEventListener(player, "playToEnd", () => {
    const to = trimLoopSeek(player.currentTime, start, end, true);
    if (to == null) return;
    player.seekBy(to - player.currentTime);
    if (active) player.play();
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <View style={[styles.fill, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={nativeControls}
        allowsPictureInPicture
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
});
