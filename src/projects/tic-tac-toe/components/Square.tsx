import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { OMark } from "@/src/projects/tic-tac-toe/components/OMark";
import { XMark } from "@/src/projects/tic-tac-toe/components/XMark";
import type { SquareValue } from "@/src/projects/tic-tac-toe/utils/game";
import type { TicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

type Props = {
  value: SquareValue;
  label: string;
  size: number;
  disabled: boolean;
  /** Part of the winning line: tinted and pulsed once. */
  winning: boolean;
  /** A mark that lost: faded back so the winning line stands out. */
  dimmed: boolean;
  onPress: () => void;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

export function Square({
  value,
  label,
  size,
  disabled,
  winning,
  dimmed,
  onPress,
  palette,
  reduceMotion,
}: Props) {
  const press = useSharedValue(1);
  const pulse = useSharedValue(1);
  const highlight = useSharedValue(winning ? 1 : 0);
  const fade = useSharedValue(dimmed ? 0.3 : 1);

  useEffect(() => {
    if (reduceMotion) {
      highlight.set(winning ? 1 : 0);
      return;
    }
    highlight.set(withTiming(winning ? 1 : 0, { duration: 220 }));
    if (winning) {
      pulse.set(
        withSequence(
          withTiming(1.08, { duration: 160 }),
          withSpring(1, { damping: 8, stiffness: 200 }),
        ),
      );
    }
  }, [winning, highlight, pulse, reduceMotion]);

  useEffect(() => {
    const target = dimmed ? 0.3 : 1;
    fade.set(reduceMotion ? target : withTiming(target, { duration: 260 }));
  }, [dimmed, fade, reduceMotion]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ scale: press.get() * pulse.get() }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.get() }));

  const markSize = size * 0.6;
  const tint = value === "O" ? palette.oSoft : palette.xSoft;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!reduceMotion)
          press.set(withSpring(0.9, { damping: 15, stiffness: 400 }));
      }}
      onPressOut={() => {
        press.set(
          reduceMotion ? 1 : withSpring(1, { damping: 12, stiffness: 300 }),
        );
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[styles.inner, contentStyle]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.highlight,
            { backgroundColor: tint },
            highlightStyle,
          ]}
        />
        {value === "X" && (
          <XMark
            size={markSize}
            color={palette.x}
            reduceMotion={reduceMotion}
          />
        )}
        {value === "O" && (
          <OMark
            size={markSize}
            color={palette.o}
            reduceMotion={reduceMotion}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    margin: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  highlight: {
    borderRadius: 18,
  },
});
