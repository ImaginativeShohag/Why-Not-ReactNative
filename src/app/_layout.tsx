import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../shared/providers/QueryProvider";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("@/src/assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <QueryProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack
              screenOptions={{
                headerBackButtonDisplayMode: "minimal",
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
              {/* Store Module */}
              <Stack.Screen
                name="projects/store/main/(tab)"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="projects/store/login" />
              <Stack.Screen name="projects/store/orders" />
              <Stack.Screen name="projects/store/place-order" />
              <Stack.Screen name="projects/store/product-details/[productId]" />
              <Stack.Screen name="projects/store/products/[categoryId]" />
              <Stack.Screen
                name="projects/store/splash"
                options={{ headerShown: false }}
              />
              {/* Camerar Social Module */}
              {/* Fitness Tracker Module */}
              {/* Offline Journal Module */}
              {/* Podcast Player Module */}
              {/* Tic-toc-toe Module */}
              <Stack.Screen name="projects/tic-tac-toe" />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryProvider>
  );
}
