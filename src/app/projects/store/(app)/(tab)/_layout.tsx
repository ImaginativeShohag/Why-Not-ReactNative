import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { type ErrorBoundaryProps, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import RouteErrorView from "@/src/projects/store/components/ui/RouteErrorView";
import { useItemCount } from "@/src/projects/store/stores/cartSelectors";
import { Colors } from "@/src/shared/constants/theme";
import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";

function TabBarIcon(props: {
  name: ComponentProps<typeof Ionicons>["name"];
  color: ColorValue;
}) {
  return <Ionicons size={26} style={{ marginBottom: -3 }} {...props} />;
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteErrorView {...props} group="tab" />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const bagCount = useItemCount();

  return (
    // ProfileSheet calls useBottomSheetModal(), which needs this provider.
    <BottomSheetModalProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tint,
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            headerShown: false,
            tabBarButtonTestID: "tab-home",
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: "Categories",
            tabBarIcon: ({ color }) => <TabBarIcon name="grid" color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarButtonTestID: "tab-search",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="search" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bag"
          options={{
            title: "Bag",
            tabBarButtonTestID: "tab-bag",
            tabBarBadge: bagCount > 0 ? bagCount : undefined,
            tabBarAccessibilityLabel: `Bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}`,
            tabBarIcon: ({ color }) => <TabBarIcon name="bag" color={color} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarButtonTestID: "tab-account",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="person-circle" color={color} />
            ),
          }}
        />
      </Tabs>
    </BottomSheetModalProvider>
  );
}
