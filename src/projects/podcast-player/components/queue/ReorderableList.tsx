import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { dragTargetIndex } from "@/src/projects/podcast-player/playback/queue";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  renderRow: (item: T, index: number) => ReactNode;
  /** Called once on drop with the original and final index. */
  onMove: (from: number, to: number) => void;
  onRemove: (key: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
  contentInsetBottom?: number;
};

type Positions = Record<string, number>;

function indexMap(keys: string[]): Positions {
  const out: Positions = {};
  keys.forEach((k, i) => (out[k] = i));
  return out;
}

const pickup = () =>
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
const drop = () => void Haptics.selectionAsync().catch(() => {});

/**
 * Drag-to-reorder + swipe-to-remove list built directly on Reanimated and
 * Gesture Handler (no draggable-flatlist). Rows are absolutely positioned
 * from a shared `positions` map, so reordering while dragging happens
 * entirely on the UI thread; React only hears about it once, on drop.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  rowHeight,
  renderRow,
  onMove,
  onRemove,
  header,
  footer,
  contentInsetBottom = 0,
}: Props<T>) {
  const keys = items.map(keyOf);
  const signature = keys.join("|");
  const positions = useSharedValue<Positions>(indexMap(keys));
  const [dragging, setDragging] = useState(false);

  // Re-sync after the parent applies a move/remove (never mid-drag).
  useEffect(() => {
    positions.set(indexMap(signature ? signature.split("|") : []));
  }, [signature, positions]);

  return (
    <ScrollView
      scrollEnabled={!dragging}
      contentContainerStyle={{ paddingBottom: contentInsetBottom }}
    >
      {header}
      <View style={{ height: items.length * rowHeight }}>
        {items.map((item, i) => {
          const key = keys[i];
          return (
            <Row
              key={key}
              id={key}
              count={items.length}
              rowHeight={rowHeight}
              positions={positions}
              onDragChange={setDragging}
              onDrop={onMove}
              onRemove={onRemove}
            >
              {renderRow(item, i)}
            </Row>
          );
        })}
      </View>
      {footer}
    </ScrollView>
  );
}

type RowProps = {
  id: string;
  count: number;
  rowHeight: number;
  positions: SharedValue<Positions>;
  onDragChange: (dragging: boolean) => void;
  onDrop: (from: number, to: number) => void;
  onRemove: (key: string) => void;
  children: ReactNode;
};

function Row({
  id,
  count,
  rowHeight,
  positions,
  onDragChange,
  onDrop,
  onRemove,
  children,
}: RowProps) {
  const { width } = useWindowDimensions();
  const active = useSharedValue(false);
  const startIndex = useSharedValue(0);
  const dragY = useSharedValue(0);
  const swipeX = useSharedValue(0);

  const handle = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      active.value = true;
      startIndex.value = positions.value[id] ?? 0;
      dragY.value = 0;
      scheduleOnRN(onDragChange, true);
      scheduleOnRN(pickup);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const from = positions.value[id];
      const to = dragTargetIndex(
        startIndex.value,
        e.translationY,
        rowHeight,
        count,
      );
      if (to === from) return;
      const next: Positions = {};
      for (const k in positions.value) {
        const p = positions.value[k];
        if (k === id) next[k] = to;
        else if (from < to && p > from && p <= to) next[k] = p - 1;
        else if (from > to && p >= to && p < from) next[k] = p + 1;
        else next[k] = p;
      }
      positions.set(next);
    })
    .onFinalize(() => {
      if (!active.value) return;
      active.value = false;
      const to = positions.value[id];
      const from = startIndex.value;
      scheduleOnRN(onDragChange, false);
      scheduleOnRN(drop);
      if (to !== from) scheduleOnRN(onDrop, from, to);
    });

  const swipe = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      swipeX.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (swipeX.value < -width * 0.35 || e.velocityX < -1200) {
        swipeX.value = withTiming(-width, { duration: 180 }, (done) => {
          if (done) scheduleOnRN(onRemove, id);
        });
      } else {
        swipeX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => {
    const index = positions.value[id] ?? 0;
    return {
      top: active.value
        ? startIndex.value * rowHeight + dragY.value
        : withTiming(index * rowHeight, { duration: 160 }),
      zIndex: active.value ? 10 : 0,
      shadowOpacity: active.value ? 0.4 : 0,
      transform: [
        { scale: withTiming(active.value ? 1.03 : 1, { duration: 120 }) },
      ],
    };
  });
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  return (
    <Animated.View style={[styles.row, { height: rowHeight }, rowStyle]}>
      <View style={styles.removeBg}>
        <Text style={styles.removeText}>Remove</Text>
      </View>
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.body}>{children}</View>
          <GestureDetector gesture={handle}>
            <View
              style={styles.handle}
              accessibilityRole="adjustable"
              accessibilityLabel="Reorder"
            >
              <Ionicons
                name="reorder-three"
                size={28}
                color={PodcastTheme.textMuted}
              />
            </View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  removeBg: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PodcastTheme.danger,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 24,
  },
  removeText: { color: "#fff", fontWeight: "700" },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PodcastTheme.background,
  },
  body: { flex: 1 },
  handle: {
    width: 52,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
