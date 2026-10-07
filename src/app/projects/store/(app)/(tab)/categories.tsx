import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import { Link } from "expo-router";
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import OfflineBanner from "@/src/projects/store/components/ui/OfflineBanner";
import { ListSkeleton } from "@/src/projects/store/components/ui/Skeleton";
import { useCategories } from "@/src/projects/store/hooks/useProduct";
import { useIsOnline } from "@/src/projects/store/query/storeQuery";

const GAP = 12;
const NUM_COLS = 2;
// Evenly distribute the gap between columns.
const ITEM_GAP = (GAP * (NUM_COLS - 1)) / NUM_COLS;

export default function CategoriesScreen() {
  const isOnline = useIsOnline();
  const {
    data: categories,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useCategories();

  if (isPending) return <ListSkeleton rows={4} />;

  if (error && !categories) {
    return (
      <ErrorStateView
        message={getErrorMessage(error) ?? "Couldn't load categories."}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <OfflineBanner visible={!isOnline} />
      <FlashList
        data={categories ?? []}
        keyExtractor={(item) => item}
        numColumns={NUM_COLS}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
        renderItem={({ item: category, index }) => {
          const marginLeft = ((index % NUM_COLS) / (NUM_COLS - 1)) * ITEM_GAP;
          const marginRight = ITEM_GAP - marginLeft;
          return (
            <Link
              href={{
                pathname: "/projects/store/products/[categoryId]",
                params: { categoryId: category },
              }}
              asChild
            >
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Browse ${category}`}
                style={({ pressed }) => [
                  styles.card,
                  { opacity: pressed ? 0.2 : 1.0 },
                ]}
              >
                <ImageBackground
                  source={{
                    uri: `https://picsum.photos/seed/${category}/300/300`,
                  }}
                  style={[styles.image, { marginLeft, marginRight }]}
                  imageStyle={styles.imageStyle}
                >
                  <BlurView style={styles.overlay}>
                    <Text style={styles.categoryText}>
                      {category.toUpperCase()}
                    </Text>
                  </BlurView>
                </ImageBackground>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 8 },
  card: {
    flex: 1,
    margin: 8,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: { flex: 1, justifyContent: "center", aspectRatio: 1 },
  imageStyle: { borderRadius: 16 },
  overlay: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    margin: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
});
