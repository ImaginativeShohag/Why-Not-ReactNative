import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { IconSymbol } from "@/src/shared/components/ui/icon-symbol";
import type { TicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

type Props = {
  canUndo: boolean;
  onUndo: () => void;
  onNewRound: () => void;
  /** The round has a result: "New round" becomes an emphasised "Play again". */
  roundOver: boolean;
  hapticsEnabled: boolean;
  /** Omit to hide the haptics toggle (for example on web). */
  onToggleHaptics?: (enabled: boolean) => void;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

export function ActionBar({
  canUndo,
  onUndo,
  onNewRound,
  roundOver,
  hapticsEnabled,
  onToggleHaptics,
  palette,
  reduceMotion,
}: Props) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!roundOver || reduceMotion) {
      cancelAnimation(pulse);
      pulse.set(1);
      return;
    }
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 650 }),
          withTiming(1, { duration: 650 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [roundOver, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.get() }],
  }));

  const primaryColor = roundOver ? palette.onAccent : palette.text;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo"
        accessibilityState={{ disabled: !canUndo }}
        style={({ pressed }) => [
          styles.button,
          styles.secondary,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            opacity: !canUndo ? 0.4 : pressed ? 0.7 : 1,
            transform: [{ scale: pressed && !reduceMotion ? 0.96 : 1 }],
          },
        ]}
      >
        <IconSymbol
          name="arrow.uturn.backward"
          size={18}
          color={palette.text}
        />
        <Text style={[styles.label, { color: palette.text }]}>Undo</Text>
      </Pressable>

      <Animated.View style={[styles.primaryWrap, pulseStyle]}>
        <Pressable
          onPress={onNewRound}
          accessibilityRole="button"
          accessibilityLabel={roundOver ? "Play again" : "New round"}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: roundOver ? palette.accent : palette.surface,
              borderColor: roundOver ? palette.accent : palette.border,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed && !reduceMotion ? 0.96 : 1 }],
            },
          ]}
        >
          <IconSymbol name="arrow.clockwise" size={18} color={primaryColor} />
          <Text style={[styles.label, { color: primaryColor }]}>
            {roundOver ? "Play again" : "New round"}
          </Text>
        </Pressable>
      </Animated.View>

      {onToggleHaptics && (
        <Pressable
          onPress={() => onToggleHaptics(!hapticsEnabled)}
          hitSlop={6}
          accessibilityRole="switch"
          accessibilityLabel="Haptics"
          accessibilityState={{ checked: hapticsEnabled }}
          style={({ pressed }) => [
            styles.icon,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <IconSymbol
            name={
              hapticsEnabled
                ? "iphone.radiowaves.left.and.right"
                : "iphone.slash"
            }
            size={20}
            color={hapticsEnabled ? palette.accent : palette.muted}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondary: {
    flex: 1,
  },
  primaryWrap: {
    flex: 1.4,
  },
  icon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
  },
});
