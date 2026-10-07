import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";
import { DATABASE_NAME, migrate } from "@/src/projects/camera-social/db/schema";
import { supportsZoomTransition } from "@/src/projects/camera-social/utils/platform";

export default function CameraSocialLayout() {
  return (
    <Suspense fallback={<Booting />}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        options={{ enableChangeListener: true }}
        onInit={migrate}
        useSuspense
      >
        {/* The ShareIntentProvider lives at the root — see src/app/_layout.tsx. */}
        <CameraSocialStack />
      </SQLiteProvider>
    </Suspense>
  );
}

function CameraSocialStack() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Palette.background },
          headerTintColor: Palette.text,
          headerTitleStyle: { color: Palette.text },
          contentStyle: { backgroundColor: Palette.background },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tab)" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="editor/[assetId]"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            // Crop gestures own the whole screen; no swipe-to-dismiss.
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="post/[id]"
          options={
            supportsZoomTransition
              ? // Zoom transition from the grid; iOS provides the interactive
                // swipe-down dismissal itself.
                { headerShown: false }
              : // Cross-fade fallback. Transparent so the grid shows through
                // while our own drag-to-dismiss fades the backdrop.
                {
                  headerShown: false,
                  presentation: "transparentModal",
                  animation: "fade",
                  contentStyle: { backgroundColor: "transparent" },
                }
          }
        />
        <Stack.Screen
          name="share-inbound"
          options={{ presentation: "modal", title: "Shared with you" }}
        />
      </Stack>
    </>
  );
}

function Booting() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Palette.background,
      }}
    >
      <ActivityIndicator color={Palette.text} />
    </View>
  );
}
