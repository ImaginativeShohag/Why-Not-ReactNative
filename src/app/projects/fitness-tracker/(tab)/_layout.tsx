import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from "expo-router";
import { Pressable } from "react-native";

import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";

export default function FitnessTabLayout() {
  const palette = usePalette();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        // The root stack hides its header for this project, so without this
        // there is no way back to the launcher from inside the tabs.
        headerLeft: () => (
          <Pressable
            onPress={() => router.navigate("/")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to projects"
            style={{ paddingHorizontal: 16 }}
          >
            <Ionicons name="chevron-back" size={24} color={palette.accent} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <Ionicons name="today" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <Ionicons name="list" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
