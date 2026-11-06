import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/src/projects/podcast-player/constants/layout";
import { usePodcastColors } from "@/src/projects/podcast-player/constants/theme";

export default function PodcastTabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = usePodcastColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        // Fixed height so MiniPlayerHost (outside the tabs) can dock above it.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        // The root stack hides its header for this project, so without this
        // there is no way back to the launcher from inside the tabs.
        headerLeft: () => (
          <Pressable
            onPress={() => router.dismissTo("/")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to projects"
            style={{ paddingHorizontal: 16 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/projects/podcast-player/settings")}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" size={22} color={color} />
          ),
          tabBarButtonTestID: "tab-discover",
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Up Next",
          tabBarIcon: ({ color }) => (
            <Ionicons name="list" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Downloads",
          tabBarIcon: ({ color }) => (
            <Ionicons name="download" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
