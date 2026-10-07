import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Palette } from "@/src/projects/camera-social/constants/theme";

type Props<T extends string> = {
  modes: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (mode: T) => void;
  disabled?: boolean;
};

const ITEM_WIDTH = 86;

/**
 * Snapping mode strip (PHOTO · VIDEO · SCAN). The selected label is always
 * centred; drag or tap to change. Snap is a spring on the UI thread.
 */
export function ModeStrip<T extends string>({
  modes,
  labels,
  value,
  onChange,
  disabled,
}: Props<T>) {
  const index = modes.indexOf(value);
  const offset = useSharedValue(-index * ITEM_WIDTH);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    offset.set(
      withSpring(-index * ITEM_WIDTH, { damping: 18, stiffness: 180 }),
    );
  }, [index, offset]);

  const select = (i: number) => {
    const next = modes[i];
    if (next && next !== value) onChange(next);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-10, 10])
    .onStart(() => {
      dragStart.set(offset.get());
    })
    .onUpdate((e) => {
      offset.set(dragStart.get() + e.translationX);
    })
    .onEnd((e) => {
      const projected = offset.get() + e.velocityX * 0.08;
      const target = Math.min(
        modes.length - 1,
        Math.max(0, Math.round(-projected / ITEM_WIDTH)),
      );
      offset.set(
        withSpring(-target * ITEM_WIDTH, { damping: 18, stiffness: 180 }),
      );
      scheduleOnRN(select, target);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container} accessibilityRole="tablist">
        <Animated.View style={[styles.row, rowStyle]}>
          {modes.map((mode, i) => {
            const selected = mode === value;
            return (
              <Pressable
                key={mode}
                disabled={disabled}
                onPress={() => select(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={styles.item}
              >
                <Text style={[styles.label, selected && styles.selected]}>
                  {labels[mode]}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { height: 36, width: "100%", overflow: "hidden" },
  row: {
    flexDirection: "row",
    position: "absolute",
    // First item centred at offset 0.
    left: "50%",
    marginLeft: -ITEM_WIDTH / 2,
    height: "100%",
  },
  item: { width: ITEM_WIDTH, alignItems: "center", justifyContent: "center" },
  label: {
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  selected: { color: Palette.accent },
});
