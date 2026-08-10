import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { QueryProvider } from "@/src/providers/QueryProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen
              name="store/main/(tab)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="store/place-order/place-order"
              options={{ headerBackButtonDisplayMode: "minimal" }}
            />
            <Stack.Screen
              name="store/products-details/[productId]"
              options={{ headerBackButtonDisplayMode: "minimal" }}
            />
            <Stack.Screen
              name="store/products/[categoryId]"
              options={{ headerBackButtonDisplayMode: "minimal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
