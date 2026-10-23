import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";
import { formatDuration } from "@/src/projects/camera-social/utils/format";

type Props = {
  id: string;
  uri: string;
  size: number;
  isVideo: boolean;
  durationSec: number | null;
  selected: boolean;
  selecting: boolean;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
};

/**
 * One library tile. `recyclingKey` stops FlashList's recycled views flashing
 * the previous asset while the new thumbnail decodes.
 */
export const AssetCell = memo(function AssetCell({
  id,
  uri,
  size,
  isVideo,
  durationSec,
  selected,
  selecting,
  onPress,
  onLongPress,
}: Props) {
  return (
    <Pressable
      onPress={() => onPress(id)}
      onLongPress={() => onLongPress(id)}
      accessibilityRole="imagebutton"
      accessibilityLabel={
        isVideo
          ? durationSec != null
            ? `Video, ${formatDuration(durationSec)}`
            : "Video"
          : "Photo"
      }
      accessibilityHint={
        selecting ? undefined : "Long press to select multiple items"
      }
      accessibilityState={{ selected }}
      style={{ width: size, height: size, padding: 1 }}
    >
      <View style={styles.tile}>
        <Image
          source={{ uri }}
          recyclingKey={id}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory"
          // Ask for a thumbnail-sized decode, not the full original.
          allowDownscaling
        />
        {isVideo ? (
          <View style={styles.video}>
            <Ionicons name="play" size={10} color="#fff" />
            {durationSec != null ? (
              <Text style={styles.videoText}>
                {formatDuration(durationSec)}
              </Text>
            ) : null}
          </View>
        ) : null}
        {selecting ? (
          <View style={[styles.check, selected && styles.checkOn]}>
            {selected ? (
              <Ionicons name="checkmark" size={14} color="#000" />
            ) : null}
          </View>
        ) : null}
        {selected ? <View style={styles.dim} /> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: Palette.surfaceRaised, overflow: "hidden" },
  video: {
    position: "absolute",
    left: 4,
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  videoText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  check: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 2,
  },
  checkOn: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});
