import { Stack } from "expo-router";

// The location task, the Live Activity / notification action listener and the
// replay of actions parked while JS was dead are all started from the root
// layout (src/app/_layout.tsx), because this layout never mounts on a headless
// or launcher-only launch.
export default function FitnessTrackerLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tab)" options={{ headerShown: false }} />
      <Stack.Screen
        name="workout/start"
        options={{ presentation: "modal", title: "Start workout" }}
      />
      {/* No swipe-back: leaving the active screen must never look like "stop". */}
      <Stack.Screen
        name="workout/active"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="workout/[id]" options={{ title: "Workout" }} />
      <Stack.Screen
        name="settings/permissions"
        options={{ title: "Permissions" }}
      />
    </Stack>
  );
}
