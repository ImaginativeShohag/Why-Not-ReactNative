import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Colors } from "@/src/constants/theme";
import { QueryProvider } from "@/src/providers/QueryProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryProvider>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
              headerShown: true,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "Home",
                tabBarIcon: ({ color }) => (
                  <TabBarIcon name="home" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="categories"
              options={{
                title: "Categories",
                tabBarIcon: ({ color }) => (
                  <TabBarIcon name="logo-dropbox" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="bag"
              options={{
                title: "Bag",
                tabBarIcon: ({ color }) => (
                  <TabBarIcon name="bag" color={color} />
                ),
              }}
            />
          </Tabs>
        </QueryProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
