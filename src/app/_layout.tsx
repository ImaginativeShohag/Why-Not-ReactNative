import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { ShareIntentProvider } from "expo-share-intent";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

// Module-scope side effects that must exist on a headless launch, before any
// project layout mounts: TaskManager task definitions and notification handlers.
import { startJournalNotificationRouting } from "@/src/projects/offline-journal/reminders/handlers";
import "@/src/projects/offline-journal/sync/task";
import { startPendingActionReplay } from "@/src/projects/fitness-tracker/tracking/task";
import "@/src/projects/podcast-player/downloads/task";
import { startNotificationResponseListener } from "@/src/projects/store/notifications/handlers";

import { useInboundShareRouting } from "@/src/projects/camera-social/hooks/useInboundShareRouting";
import { PROJECTS } from "@/src/shared/config/projects";
import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../shared/providers/QueryProvider";

// A tapped store push on a cold start opens the app in the launcher; the
// store layout hasn't loaded, so the response would be lost. This only listens and buffers the route — it never asks for push
// permission, which stays tied to the store's signed-in session.
startNotificationResponseListener();
// Same reason for the journal's reminder taps (routes to compose).
startJournalNotificationRouting();
// Fitness lock-screen / notification actions tapped while JS was dead are parked;
// replay them on launch and on every return to the foreground.
startPendingActionReplay();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("@/src/assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <QueryProvider>
      {/*
        Root-level because the OS can hand us shared media while the user is
        anywhere (launcher included), and expo-share-intent reads it from the
        linking URL. resetOnBackground: false keeps a share alive until the
        Camera & Social inbound screen has imported it.
      */}
      <ShareIntentProvider options={{ resetOnBackground: false }}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack
                screenOptions={{
                  headerBackButtonDisplayMode: "minimal",
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
                {/* Every project owns its own stack in src/app/projects/<slug>/_layout.tsx */}
                {PROJECTS.map(({ slug, title, singleScreen }) =>
                  singleScreen ? (
                    <Stack.Screen
                      key={slug}
                      name={`projects/${slug}/index`}
                      options={{ title }}
                    />
                  ) : (
                    <Stack.Screen
                      key={slug}
                      name={`projects/${slug}`}
                      options={{ headerShown: false }}
                    />
                  ),
                )}
              </Stack>
              <StatusBar style="auto" />
              <ShareIntentRouting />
            </ThemeProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ShareIntentProvider>
    </QueryProvider>
  );
}

/** Hooks need a component; this one renders nothing. */
function ShareIntentRouting() {
  useInboundShareRouting();
  return null;
}
