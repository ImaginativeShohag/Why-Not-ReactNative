import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";
import { formatDuration } from "@/src/projects/camera-social/utils/format";

type Props = {
  thumbUri: string;
  /** width / height — drives the masonry cell height. */
  aspectRatio: number;
  isVideo: boolean;
  durationSec: number | null;
  favorite: boolean;
  edited: boolean;
  recyclingKey: string;
};

/** Feed grid cell. Always renders the ~400px thumbnail, never the original. */
export function CaptureCell({
  thumbUri,
  aspectRatio,
  isVideo,
  durationSec,
  favorite,
  edited,
  recyclingKey,
}: Props) {
  // Clamp so panoramas/very tall shots don't wreck the masonry rhythm.
  const ratio = Math.min(1.6, Math.max(0.6, aspectRatio || 1));
  return (
    <View style={[styles.cell, { aspectRatio: ratio }]}>
      <Image
        source={{ uri: thumbUri }}
        recyclingKey={recyclingKey}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
      <View style={styles.badges}>
        {favorite ? <Ionicons name="heart" size={14} color="#fff" /> : null}
        {edited ? <Ionicons name="color-wand" size={14} color="#fff" /> : null}
      </View>
      {isVideo ? (
        <View style={styles.video}>
          <Ionicons name="play" size={11} color="#fff" />
          {durationSec != null ? (
            <Text style={styles.videoText}>{formatDuration(durationSec)}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    margin: 2,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Palette.surfaceRaised,
  },
  badges: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    gap: 4,
  },
  video: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
