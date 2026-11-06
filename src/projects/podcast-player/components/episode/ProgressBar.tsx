import { StyleSheet, View } from "react-native";

import { usePodcastColors } from "@/src/projects/podcast-player/constants/theme";

type Props = {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({
  progress,
  color,
  trackColor,
  height = 3,
}: Props) {
  const colors = usePodcastColors();
  const pct = Math.max(
    0,
    Math.min(1, Number.isFinite(progress) ? progress : 0),
  );
  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.border,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color ?? colors.accent,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
});
