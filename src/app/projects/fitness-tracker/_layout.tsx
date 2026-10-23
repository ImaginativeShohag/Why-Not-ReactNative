import { router, Stack } from "expo-router";
import { Pressable, Text } from "react-native";

import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";

// The location task, the Live Activity / notification action listener and the
// replay of actions parked while JS was dead are all started from the root
// layout (src/app/_layout.tsx), because this layout never mounts on a headless
// or launcher-only launch.
export default function FitnessTrackerLayout() {
  const palette = usePalette();
  // Modals get an explicit way out; swipe-down alone isn't discoverable.
  const closeButton = () => (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close"
    >
      <Text style={{ color: palette.accent, fontSize: 17 }}>Close</Text>
    </Pressable>
  );

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      {/* The title names the back target of pushed screens (not "(tab)"). */}
      <Stack.Screen
        name="(tab)"
        options={{ headerShown: false, title: "Fitness" }}
      />
      <Stack.Screen
        name="workout/start"
        options={{
          presentation: "modal",
          title: "Start workout",
          headerLeft: closeButton,
        }}
      />
      {/* No swipe-back: leaving the active screen must never look like "stop". */}
      <Stack.Screen
        name="workout/active"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="workout/[id]" options={{ title: "Workout" }} />
      <Stack.Screen
        name="settings/permissions"
        options={{
          presentation: "modal",
          title: "Permissions",
          headerLeft: closeButton,
        }}
      />
    </Stack>
  );
}
