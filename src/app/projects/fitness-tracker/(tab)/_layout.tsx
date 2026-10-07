import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";

export default function FitnessTabLayout() {
  const palette = usePalette();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: palette.accent }}>
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
