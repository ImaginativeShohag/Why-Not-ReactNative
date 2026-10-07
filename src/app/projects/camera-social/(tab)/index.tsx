import Ionicons from "@expo/vector-icons/Ionicons";
import { FlashList } from "@shopify/flash-list";
import { Link, Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CaptureCell } from "@/src/projects/camera-social/components/feed/CaptureCell";
import { IconButton } from "@/src/projects/camera-social/components/common/IconButton";
import { Palette } from "@/src/projects/camera-social/constants/theme";
import type { CaptureGridItem } from "@/src/projects/camera-social/db/captures";
import { useCaptureGrid } from "@/src/projects/camera-social/hooks/useCaptures";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { captures, loading } = useCaptureGrid();

  const openCamera = () => router.push("/projects/camera-social/camera");
  const leaveProject = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const renderItem = ({ item }: { item: CaptureGridItem }) => {
    const cell = (
      <CaptureCell
        thumbUri={item.thumbUri}
        aspectRatio={item.width / item.height}
        isVideo={item.kind === "video"}
        durationSec={item.durationMs != null ? item.durationMs / 1000 : null}
        favorite={item.favorite}
        edited={item.origin === "edit"}
        recyclingKey={item.id}
      />
    );
    return (
      <Link href={`/projects/camera-social/post/${item.id}`} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.caption || "Open capture"}
        >
          {/* Zoom transition on iOS 18+; a plain Slot (→ cross-fade) elsewhere. */}
          <Link.AppleZoom>{cell}</Link.AppleZoom>
        </Pressable>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      <FeedHeaderButtons onBack={leaveProject} onCamera={openCamera} />
      {captures.length === 0 && !loading ? (
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="camera-outline"
          iconColor={Palette.textMuted}
          title="No captures yet"
          description="Photos and videos you take, import or receive show up here."
          titleColor={Palette.text}
          descriptionColor={Palette.textMuted}
          action={{
            label: "Open camera",
            onPress: openCamera,
            color: Palette.text,
            labelColor: "#000",
          }}
        />
      ) : (
        <FlashList
          data={captures}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          numColumns={2}
          masonry
          contentContainerStyle={{
            padding: 2,
            paddingBottom: insets.bottom + 90,
          }}
        />
      )}
      <Pressable
        onPress={openCamera}
        accessibilityRole="button"
        accessibilityLabel="Open camera"
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <Ionicons name="camera" size={28} color="#000" />
      </Pressable>
    </View>
  );
}

/** Header buttons need screen callbacks, so they're set from inside the screen. */
function FeedHeaderButtons({
  onBack,
  onCamera,
}: {
  onBack: () => void;
  onCamera: () => void;
}) {
  return (
    <Tabs.Screen
      options={{
        headerLeft: () => (
          <IconButton
            icon="chevron-back"
            onPress={onBack}
            accessibilityLabel="Back to projects"
          />
        ),
        headerRight: () => (
          <IconButton
            icon="camera-outline"
            onPress={onCamera}
            accessibilityLabel="Open camera"
          />
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
