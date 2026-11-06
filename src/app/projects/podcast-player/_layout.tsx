import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { MiniPlayerHost } from "@/src/projects/podcast-player/containers/MiniPlayerHost";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import { registerBackgroundTask } from "@/src/projects/podcast-player/downloads/task";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { usePodcastColors } from "@/src/projects/podcast-player/constants/theme";
import { useWindowBackground } from "@/src/shared/hooks/use-window-background";

export default function PodcastPlayerLayout() {
  const colors = usePodcastColors();
  useWindowBackground(colors.background);
  useEffect(() => {
    // Idempotent: the singletons survive leaving and re-entering the project.
    void playbackService.init().catch(() => {});
    void downloadManager.init().catch(() => {});
    void registerBackgroundTask();
  }, []);

  return (
    <MiniPlayerHost>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Title doubles as the back label, so pushed screens never show "(tab)". */}
        <Stack.Screen
          name="(tab)"
          options={{
            headerShown: false,
            title: "Podcasts",
            headerBackTitle: "Podcasts",
          }}
        />
        <Stack.Screen name="podcast/[id]" options={{ title: "" }} />
        <Stack.Screen name="episode/[id]" options={{ title: "Episode" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen
          name="player"
          options={({ route }) => ({
            headerShown: false,
            presentation: "transparentModal",
            // The screenOptions background would sit opaque behind the sheet, so
            // dragging it down would show a solid fill, not the screen below.
            contentStyle: { backgroundColor: "transparent" },
            // After a drag-to-expand the host has already animated the sheet
            // up; pushing without animation makes the handover seamless.
            animation:
              (route.params as { from?: string } | undefined)?.from === "drag"
                ? "none"
                : "slide_from_bottom",
            gestureEnabled: true,
            gestureDirection: "vertical",
          })}
        />
      </Stack>
    </MiniPlayerHost>
  );
}
