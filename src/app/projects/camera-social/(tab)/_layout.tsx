import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { Palette } from "@/src/projects/camera-social/constants/theme";

export default function CameraSocialTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.text,
        tabBarInactiveTintColor: Palette.textFaint,
        tabBarStyle: {
          backgroundColor: Palette.background,
          borderTopColor: Palette.border,
        },
        headerStyle: { backgroundColor: Palette.background },
        headerTintColor: Palette.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: Palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "images" : "images-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
