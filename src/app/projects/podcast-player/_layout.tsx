import { Stack } from "expo-router";
import { useEffect } from "react";

import { MiniPlayerHost } from "@/src/projects/podcast-player/containers/MiniPlayerHost";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import { registerBackgroundTask } from "@/src/projects/podcast-player/downloads/task";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

export default function PodcastPlayerLayout() {
  useEffect(() => {
    // Idempotent: the singletons survive leaving and re-entering the project.
    void playbackService.init().catch(() => {});
    void downloadManager.init().catch(() => {});
    void registerBackgroundTask();
  }, []);

  return (
    <MiniPlayerHost>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: PodcastTheme.background },
          headerTintColor: PodcastTheme.text,
          headerTitleStyle: { color: PodcastTheme.text },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: PodcastTheme.background },
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
