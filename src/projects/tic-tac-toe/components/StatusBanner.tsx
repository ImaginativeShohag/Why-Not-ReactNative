import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { OMark } from "@/src/projects/tic-tac-toe/components/OMark";
import { XMark } from "@/src/projects/tic-tac-toe/components/XMark";
import type { Player } from "@/src/projects/tic-tac-toe/utils/game";
import type { TicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

type Props = {
  text: string;
  /** The mark shown in the pill: whose turn it is, or who won. Null on a draw. */
  mark: Player | null;
  /** The computer is about to move: shows bouncing dots. */
  thinking: boolean;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

const HEIGHT = 52;

function Dot({
  delay,
  color,
  reduceMotion,
}: {
  delay: number;
  color: string;
  reduceMotion: boolean;
}) {
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    lift.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 220 }),
            withTiming(0, { duration: 220 }),
          ),
          -1,
        ),
      ),
    );
    return () => cancelAnimation(lift);
  }, [delay, lift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.get() }],
  }));
  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />
  );
}

export function StatusBanner({
  text,
  mark,
  thinking,
  palette,
  reduceMotion,
}: Props) {
  const color =
    mark === "O" ? palette.o : mark === "X" ? palette.x : palette.muted;
  const tint =
    mark === "O"
      ? palette.oSoft
      : mark === "X"
        ? palette.xSoft
        : palette.surface;

  return (
    <View style={styles.slot}>
      <Animated.View
        key={text}
        entering={reduceMotion ? undefined : FadeInDown.duration(240)}
        exiting={reduceMotion ? undefined : FadeOutUp.duration(160)}
        style={[
          styles.pill,
          { backgroundColor: tint, borderColor: palette.border },
        ]}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={text}
      >
        {thinking ? (
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <Dot
                key={i}
                delay={i * 120}
                color={color}
                reduceMotion={reduceMotion}
              />
            ))}
          </View>
        ) : mark === "X" ? (
          <XMark size={20} color={color} reduceMotion />
        ) : mark === "O" ? (
          <OMark size={20} color={color} reduceMotion />
        ) : null}
        <Text style={[styles.text, { color: palette.text }]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    // Absolute so the outgoing and incoming pills overlap instead of stacking.
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: HEIGHT - 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
