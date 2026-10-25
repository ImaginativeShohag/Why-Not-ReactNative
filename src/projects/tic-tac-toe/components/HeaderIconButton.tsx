import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  /** The icon showing the current value. */
  children: ReactNode;
  onPress: () => void;
  /** Changes whenever the value changes; the icon pops each time. */
  popKey: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  reduceMotion: boolean;
};

/**
 * A round, icon-only button for the header. Each tap moves to the next value
 * (the screen decides what that is), and the icon springs to acknowledge it.
 */
export function HeaderIconButton({
  children,
  onPress,
  popKey,
  accessibilityLabel,
  accessibilityHint,
  reduceMotion,
}: Props) {
  const scale = useSharedValue(1);
  const press = useSharedValue(1);
  const previousKeyRef = useRef(popKey);

  useEffect(() => {
    if (previousKeyRef.current === popKey) return;
    previousKeyRef.current = popKey;
    if (reduceMotion) return;
    scale.set(
      withSequence(
        withTiming(0.6, { duration: 90 }),
        withSpring(1, { damping: 9, stiffness: 260 }),
      ),
    );
  }, [popKey, reduceMotion, scale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() * press.get() }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) press.set(withSpring(0.85, { stiffness: 400 }));
      }}
      onPressOut={() => {
        press.set(reduceMotion ? 1 : withSpring(1, { stiffness: 300 }));
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={styles.button}
    >
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
