import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { PodcastTheme, shade } from "@/src/projects/podcast-player/utils/color";

type Props = { accent: string };

/**
 * Full-bleed background gradient derived from the artwork colour. When the
 * track (and so the accent) changes, the new gradient cross-fades over the
 * old one instead of snapping.
 */
export function ArtworkGradient({ accent }: Props) {
  const [layers, setLayers] = useState({ from: accent, to: accent });
  // Adjust-state-during-render: remember the outgoing colour for the fade.
  if (layers.to !== accent) {
    setLayers({ from: layers.to, to: accent });
  }
  const t = useSharedValue(1);
  useEffect(() => {
    t.set(0);
    t.set(withTiming(1, { duration: 700 }));
  }, [accent, t]);

  const topStyle = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <>
      <Gradient color={layers.from} />
      <Animated.View style={[StyleSheet.absoluteFill, topStyle]}>
        <Gradient color={layers.to} />
      </Animated.View>
    </>
  );
}

function Gradient({ color }: { color: string }) {
  return (
    <LinearGradient
      colors={[shade(color, 0.15), shade(color, 0.6), PodcastTheme.background]}
      locations={[0, 0.45, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}
