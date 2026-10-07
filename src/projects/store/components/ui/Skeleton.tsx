import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** A pulsing placeholder block. Skeletons, not spinners, for known shapes. */
export function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.block, style, animated]} />;
}

/** Two-column product grid placeholder. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View
      style={styles.grid}
      accessible
      accessibilityLabel="Loading products"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock style={styles.image} />
          <SkeletonBlock style={styles.line} />
          <SkeletonBlock style={styles.shortLine} />
        </View>
      ))}
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View
      style={styles.list}
      accessible
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} style={styles.row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: "rgba(120,120,128,0.2)", borderRadius: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 8 },
  card: { width: "50%", padding: 8, gap: 8 },
  image: { aspectRatio: 1, borderRadius: 16 },
  line: { height: 14 },
  shortLine: { height: 14, width: "50%" },
  list: { padding: 16, gap: 12 },
  row: { height: 88, borderRadius: 16 },
});
