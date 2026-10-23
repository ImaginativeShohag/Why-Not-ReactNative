import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { Component, useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { LockGate } from "@/src/projects/offline-journal/components/LockGate";
import { DATABASE_NAME } from "@/src/projects/offline-journal/db/client";
import { initDatabase } from "@/src/projects/offline-journal/db/init";
import { useAppLock } from "@/src/projects/offline-journal/hooks/useAppLock";
import {
  useJournalScheme,
  usePalette,
} from "@/src/projects/offline-journal/hooks/usePalette";
import { useSyncTriggers } from "@/src/projects/offline-journal/hooks/useSyncStatus";
import { ThemedText } from "@/src/shared/components/themed-text";

// Module scope: the provider reopens the database whenever `options` changes
// identity, so it must not be a fresh object per render.
const DB_OPTIONS = { enableChangeListener: true };

export default function JournalLayout() {
  // Not `useSuspense`: suspense mode caches the open promise module-wide, and a
  // rejected one is never retried (even a new options object chains onto it),
  // so "Try again" could never recover. Without it the provider throws the
  // open error into the boundary below, and a reset remounts it with a fresh
  // open. While opening it renders nothing, which is a frame or two.
  return (
    <DatabaseErrorBoundary>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        options={DB_OPTIONS}
        onInit={initDatabase}
      >
        <JournalStack />
      </SQLiteProvider>
    </DatabaseErrorBoundary>
  );
}

function JournalStack() {
  const { locked, obscured, authenticate, lockNow } = useAppLock();
  const scheme = useJournalScheme();
  const palette = usePalette();
  useSyncTriggers();
  // Leaving the journal for the launcher re-arms the lock, so coming back in
  // asks again. (No-op when the lock is off: `locked` is gated on the setting.)
  useEffect(() => lockNow, [lockNow]);

  return (
    // The Theme setting is applied by nesting a navigation theme and a status
    // bar style, both scoped to this subtree: leaving the journal unmounts them
    // and the launcher is back on the system scheme.
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <LockGate locked={locked} obscured={obscured} onUnlock={authenticate}>
        <Stack
          screenOptions={{
            headerTintColor: palette.accent,
            contentStyle: { backgroundColor: palette.paper },
          }}
        >
          {/* The title is what a pushed screen's back button shows; without it
              iOS falls back to the route group name, "(tab)". */}
          <Stack.Screen
            name="(tab)"
            options={{ headerShown: false, title: "Journal" }}
          />
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
    </ThemeProvider>
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
