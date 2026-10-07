import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type LockScreenViewProps = {
  /** Null hides the button — used for the app-switcher privacy cover. */
  onUnlock: (() => void) | null;
};

/** The opaque "Journal locked" surface. Shared by LockGate and the /lock route. */
export function LockScreenView({ onUnlock }: LockScreenViewProps) {
  const palette = usePalette();

  return (
    <View style={[styles.fill, { backgroundColor: palette.cover }]}>
      <Ionicons name="lock-closed" size={40} color={palette.muted} />
      <ThemedText type="subtitle" style={{ color: palette.text }}>
        Journal locked
      </ThemedText>
      {onUnlock ? (
        <Pressable
          onPress={onUnlock}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: palette.accent }]}
        >
          <ThemedText style={{ color: palette.accentText, fontWeight: "600" }}>
            Unlock
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  button: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 22 },
});
