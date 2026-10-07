import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { Component, Suspense, useEffect, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { LockGate } from "@/src/projects/offline-journal/components/LockGate";
import { DATABASE_NAME } from "@/src/projects/offline-journal/db/client";
import { initDatabase } from "@/src/projects/offline-journal/db/init";
import { useAppLock } from "@/src/projects/offline-journal/hooks/useAppLock";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { useSyncTriggers } from "@/src/projects/offline-journal/hooks/useSyncStatus";
import { useThemeOverride } from "@/src/projects/offline-journal/hooks/useThemeOverride";
import { useSettingsStore } from "@/src/projects/offline-journal/stores/settingsStore";
import { ThemedText } from "@/src/shared/components/themed-text";

export default function JournalLayout() {
  return (
    <DatabaseErrorBoundary>
      <Suspense fallback={<Booting />}>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          options={{ enableChangeListener: true }}
          onInit={initDatabase}
          useSuspense
        >
          <JournalStack />
        </SQLiteProvider>
      </Suspense>
    </DatabaseErrorBoundary>
  );
}

function JournalStack() {
  const { locked, obscured, authenticate, lockNow } = useAppLock();
  const theme = useSettingsStore((state) => state.theme);
  const palette = usePalette();
  useThemeOverride(theme);
  useSyncTriggers();
  // Leaving the journal for the launcher re-arms the lock, so coming back in
  // asks again. (No-op when the lock is off: `locked` is gated on the setting.)
  useEffect(() => lockNow, [lockNow]);

  return (
    <LockGate locked={locked} obscured={obscured} onUnlock={authenticate}>
      <Stack
        screenOptions={{
          headerTintColor: palette.accent,
          contentStyle: { backgroundColor: palette.paper },
        }}
      >
        <Stack.Screen name="(tab)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/[id]" options={{ title: "Entry" }} />
        <Stack.Screen
          name="entry/compose"
          options={{ presentation: "modal", title: "New entry" }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="lock"
          options={{ headerShown: false, animation: "fade" }}
        />
      </Stack>
    </LockGate>
  );
}

function Booting() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

/**
 * The DB open + migration can throw (a bad migration, a full disk). Without a
 * boundary that is a red screen; with one it is a message and a retry.
 */
class DatabaseErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.center}>
        <ThemedText type="subtitle">Could not open the journal</ThemedText>
        <ThemedText style={styles.error}>{this.state.error.message}</ThemedText>
        <Pressable onPress={() => this.setState({ error: null })}>
          <ThemedText type="link">Try again</ThemedText>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  error: { textAlign: "center", opacity: 0.7 },
});
