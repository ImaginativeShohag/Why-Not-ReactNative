import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type UndoSnackbarProps = {
  visible: boolean;
  message: string;
  onUndo: () => void;
  bottom?: number;
};

/** Undo instead of a confirm dialog: the destructive action is cheap to reverse. */
export function UndoSnackbar({
  visible,
  message,
  onUndo,
  bottom = 24,
}: UndoSnackbarProps) {
  const palette = usePalette();
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(180)}
      accessibilityLiveRegion="polite"
      style={[styles.bar, { bottom, backgroundColor: palette.text }]}
    >
      <ThemedText style={[styles.message, { color: palette.paper }]}>
        {message}
      </ThemedText>
      <Pressable onPress={onUndo} hitSlop={8} accessibilityRole="button">
        <ThemedText style={[styles.undo, { color: palette.accent }]}>
          Undo
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  message: { fontSize: 15 },
  undo: { fontSize: 15, fontWeight: "700" },
});
