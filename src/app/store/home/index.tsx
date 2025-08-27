import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

import Carousel from "react-native-reanimated-carousel";
import { renderItem } from "@/src/utils/render-item";
import { ThemedText } from "@/src/components/themed-text";
import ProductView from "@/src/components/ui/product-item";
import { useCategories, useProducts } from "@/src/hooks/useProduct";
import { useRouter } from "expo-router";

const defaultDataWith6Colors = [
  "#B0604D",
  "#899F9C",
  "#B3C680",
  "#5C6265",
  "#F5D399",
  "#F1F1F1",
];
const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const router = useRouter();

  const {
    data: products,
    isLoading: productsIsLoading,
    error: productsLoadingError,
  } = useProducts();
  const {
    data: categories,
    isLoading: categoriesIsLoading,
    error: categoriesLoadingError,
  } = useCategories();

  return (
    <View style={styles.container}>
      <FlashList
        data={products}
        keyExtractor={(item) => String(item.id)}
        masonry={true}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 0 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={() => (
          <View style={{ gap: 16 }}>
            <View style={styles.headerContainer}>
              <ThemedText
                type={"subtitle"}
                style={{ flex: 1, fontWeight: "normal" }}
              >
                Welcome,
                <ThemedText type={"subtitle"} style={{ fontWeight: "bold" }}>
                  Lorem Ipsum build!
                </ThemedText>
              </ThemedText>

              <Ionicons name="person-circle-outline" size={32} />
            </View>

            <Carousel
              loop={true}
              width={screenWidth - 16 * 2}
              height={150}
              snapEnabled={true}
              pagingEnabled={true}
              autoPlayInterval={2000}
              data={defaultDataWith6Colors}
              style={{ width: "100%" }}
              onSnapToItem={(index) => console.log("current index:", index)}
              mode="parallax"
              modeConfig={{
                parallaxScrollingScale: 0.9,
                parallaxScrollingOffset: 50,
              }}
              renderItem={renderItem({
                rounded: true,
                style: { marginHorizontal: 0 },
              })}
            />
            <FlashList
              data={categories}
              keyExtractor={(item) => item}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    // todo
                  }}
                >
                  <View style={styles.categoryItemContainer}>
                    <Ionicons name="cube-outline" size={16} color="black" />
                    <Text style={styles.categoryItemText}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              router.push(`/store/product-details/${item.id}`);
            }}
          >
            <ProductView
              title={item.title}
              price={item.price}
              image={item.image}
              rating={item.rating.rate}
              ratingCount={item.rating.count}
              quantity={item.quantity}
              onPlusClick={() => {}}
              onMinusClick={() => {}}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  itemContainer: {
    flex: 1, // Allows items to take equal width within their column
    margin: 5,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 50, // Example minimum height for items
  },
  itemText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  categoryItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  categoryItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
