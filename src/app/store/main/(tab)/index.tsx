import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

import Carousel from "react-native-reanimated-carousel";
import { renderItem } from "@/src/utils/render-item";
import { ThemedText } from "@/src/components/themed-text";
import ProductView from "@/src/components/ui/product-item";
import { useCategories, useProducts } from "@/src/hooks/useProduct";
import { useCartStore } from "@/src/stores/cartStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef } from "react";
import { Link, useNavigation } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import ProfileScreen from "@/src/app/store/profile/profile";

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
  const navigation = useNavigation();
  const { items, addToCart, updateQuantity } = useCartStore();
  const sheetRef = useRef<BottomSheetModal>(null);

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

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // callbacks
  const handleSheetChange = useCallback((index: number) => {
    console.log("handleSheetChange", index);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={styles.container}>
        <FlashList
          data={products}
          keyExtractor={(item) => String(item.id)}
          masonry={true}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          ListHeaderComponent={() => (
            <View style={{ gap: 16 }}>
              <View style={styles.headerContainer}>
                <ThemedText
                  type={"subtitle"}
                  style={{ flex: 1, fontWeight: "normal" }}
                >
                  Welcome,{" "}
                  <ThemedText type={"subtitle"} style={{ fontWeight: "bold" }}>
                    Lorem Ipsum!
                  </ThemedText>
                </ThemedText>

                <Pressable
                  onPress={() => {
                    sheetRef.current?.present();
                  }}
                >
                  <Ionicons name="person-circle-outline" size={32} />
                </Pressable>
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
                renderItem={({ item: category }) => (
                  <Link
                    href={{
                      pathname: "/store/products/[categoryId]",
                      params: { categoryId: category },
                    }}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.2 : 1.0,
                        },
                      ]}
                    >
                      <View style={styles.categoryItemContainer}>
                        <Ionicons name="cube-outline" size={16} color="black" />
                        <Text style={styles.categoryItemText}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                )}
              />
            </View>
          )}
          renderItem={({ item: product }) => {
            const cartItem = items.find((i) => i.id === product.id);

            const increaseQuantity = () => {
              if (!product) return;
              if (!cartItem) {
                addToCart(product);
              } else {
                updateQuantity(product.id, 1);
              }
            };

            const decreaseQuantity = () => {
              if (!cartItem) return;
              if (cartItem.quantity > 1) {
                updateQuantity(product.id, -1);
              }
            };

            return (
              <Link
                href={{
                  pathname: "/store/product-details/[productId]",
                  params: { productId: product.id },
                }}
                asChild
              >
                <Pressable
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.2 : 1.0,
                    },
                  ]}
                >
                  <ProductView
                    title={product.title}
                    price={product.price}
                    image={product.image}
                    rating={product.rating.rate}
                    ratingCount={product.rating.count}
                    quantity={cartItem?.quantity ?? 0}
                    onPlusClick={() => {
                      increaseQuantity();
                    }}
                    onMinusClick={() => {
                      decreaseQuantity();
                    }}
                  />
                </Pressable>
              </Link>
            );
          }}
        />
      </View>

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={["90%"]}
        enableDynamicSizing={false}
        onChange={handleSheetChange}
      >
        <BottomSheetScrollView>
          <ProfileScreen />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
