import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { Link } from "expo-router";
import { useCategories } from "@/src/hooks/useProduct";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";

export default function CategoriesScreen() {
  const gap = 12;
  const numCols = 2;

  // Evenly distribute the gap width between each item (4 columns has 3 gaps)
  const itemGap = (gap * (numCols - 1)) / numCols;

  const {
    data: categories,
    isLoading: productsIsLoading,
    error: productsLoadingError,
    refetch,
  } = useCategories();

  if (productsIsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (productsLoadingError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{productsLoadingError.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlashList
      data={categories ?? []}
      keyExtractor={(item) => item}
      numColumns={numCols}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshControl={
        <RefreshControl
          refreshing={productsIsLoading}
          onRefresh={() => refetch()}
        />
      }
      renderItem={({ item: category, index }) => {
        // Left margin increases for each column, right margin decreases for each column
        // What's important is that marginRight + marginLeft === itemGap
        const marginLeft = ((index % numCols) / (numCols - 1)) * itemGap;
        const marginRight = itemGap - marginLeft;

        return (
          <Link
            href={{
              pathname: "/store/products/[categoryId]",
              params: { categoryId: category },
            }}
            asChild
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  opacity: pressed ? 0.2 : 1.0,
                },
              ]}
            >
              <ImageBackground
                source={{
                  uri: `https://picsum.photos/seed/${category}/300/300`,
                }}
                style={[
                  styles.image,
                  {
                    marginLeft,
                    marginRight,
                  },
                ]}
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
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7", // iOS systemGroupedBackground equivalent
  },
  error: {
    fontSize: 16,
    color: "red",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
  },
  list: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    flex: 1,
    justifyContent: "center",
    aspectRatio: 1,
  },
  imageStyle: {
    borderRadius: 16,
  },
  overlay: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    margin: 12,
    overflow: "hidden",
    textAlign: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
});
