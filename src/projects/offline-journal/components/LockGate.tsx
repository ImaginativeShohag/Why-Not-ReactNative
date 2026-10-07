import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { LockScreenView } from "./LockScreenView";

export type LockGateProps = {
  /** Authentication required. */
  locked: boolean;
  /** App is backgrounded / in the switcher: cover, but don't prompt. */
  obscured?: boolean;
  onUnlock: () => Promise<boolean>;
  children: ReactNode;
};

/**
 * Renders the tree always, and an opaque cover on top when locked. Covering
 * instead of unmounting keeps navigation state — and the cover is what hides the
 * journal from the app-switcher snapshot, since it is already on screen when the
 * OS takes it.
 */
export function LockGate({
  locked,
  obscured = false,
  onUnlock,
  children,
}: LockGateProps) {
  useEffect(() => {
    // Prompt as soon as we lock — but not while backgrounded, where the system
    // prompt would fail or appear over another app.
    if (locked && !obscured) void onUnlock();
  }, [locked, obscured, onUnlock]);

  const covered = locked || obscured;

  return (
    <View style={styles.fill}>
      {/* Hidden from accessibility while covered, so VoiceOver can't read through. */}
      <View
        style={styles.fill}
        importantForAccessibility={covered ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={covered}
      >
        {children}
      </View>
      {covered ? (
        <View style={StyleSheet.absoluteFill}>
          <LockScreenView onUnlock={locked ? () => void onUnlock() : null} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
