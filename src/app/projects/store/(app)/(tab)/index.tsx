import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { Link, useRouter } from "expo-router";
import { useRef } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { useSession } from "@/src/projects/store/auth/useSession";
import ProfileSheet from "@/src/projects/store/components/sheet/ProfileSheet";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import OfflineBanner from "@/src/projects/store/components/ui/OfflineBanner";
import ProductGrid from "@/src/projects/store/components/ui/ProductGrid";
import { ProductGridSkeleton } from "@/src/projects/store/components/ui/Skeleton";
import { SlideItem } from "@/src/projects/store/components/SlideItem";
import { useCartActions } from "@/src/projects/store/hooks/useCartActions";
import {
  useCategories,
  useInfiniteProducts,
  usePrefetchProduct,
  useProducts,
} from "@/src/projects/store/hooks/useProduct";
import { useWishlist } from "@/src/projects/store/hooks/useWishlist";
import { useIsOnline } from "@/src/projects/store/query/storeQuery";
import { formatPrice } from "@/src/projects/store/utils/money";
import { capitalize } from "@/src/projects/store/utils/text";
import { ThemedText } from "@/src/shared/components/themed-text";
import { storeColors } from "@/src/projects/store/constants/theme";

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const router = useRouter();
  const session = useSession();
  const sheetRef = useRef<BottomSheetModal>(null);
  const isOnline = useIsOnline();
  const prefetch = usePrefetchProduct();
  const cart = useCartActions();
  const wishlist = useWishlist((message) => Alert.alert("Wishlist", message));

  const catalogue = useInfiniteProducts();
  const { data: featured = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  const products = catalogue.data ?? [];
  const greetingName =
    session.user?.displayName ??
    session.user?.username ??
    (session.status === "guest" ? "Guest" : "");

  const header = (
    <View style={{ gap: 16 }}>
      <View style={styles.headerContainer}>
        <ThemedText type="subtitle" style={{ flex: 1, fontWeight: "normal" }}>
          Welcome,{" "}
          <ThemedText type="subtitle" style={{ fontWeight: "bold" }}>
            {greetingName}!
          </ThemedText>
        </ThemedText>

        <Pressable
          onPress={() => {
            if (session.status === "signedIn") sheetRef.current?.present();
            else router.push("/projects/store/sign-in");
          }}
          accessibilityRole="button"
          accessibilityLabel={
            session.status === "signedIn" ? "Open profile" : "Sign in"
          }
          style={({ pressed }) => [pressed && styles.buttonPressed]}
        >
          <Ionicons name="person-circle-outline" size={32} />
        </Pressable>
      </View>

      {featured.length > 0 ? (
        <Carousel
          loop
          width={screenWidth - 16 * 2}
          height={150}
          snapEnabled
          pagingEnabled
          autoPlayInterval={3000}
          autoPlay
          data={featured.slice(0, 6)}
          style={{ width: "100%" }}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.9,
            parallaxScrollingOffset: 50,
          }}
          renderItem={({ item }) => (
            <Link
              style={{ flex: 1 }}
              href={{
                pathname: "/projects/store/product/[id]",
                params: { id: item.id },
              }}
              asChild
            >
              <Pressable
                onPressIn={() => prefetch(item)}
                style={({ pressed }) => [
                  { flex: 1, opacity: pressed ? 0.2 : 1.0 },
                ]}
              >
                <SlideItem
                  title={item.title}
                  uri={item.image}
                  priceLabel={formatPrice(item.price)}
                  rounded
                  style={{ marginHorizontal: 0 }}
                />
              </Pressable>
            </Link>
          )}
        />
      ) : null}

      <FlashList
        data={categories}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        renderItem={({ item: category }) => (
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
              style={({ pressed }) => [{ opacity: pressed ? 0.2 : 1.0 }]}
            >
              <View style={styles.categoryItemContainer}>
                <Ionicons name="cube-outline" size={16} color="black" />
                <Text style={styles.categoryItemText}>
                  {capitalize(category)}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
      <Text style={styles.sectionTitle} accessibilityRole="header">
        All products
      </Text>
    </View>
  );

  const renderBody = () => {
    // Skeleton only when there is truly nothing to show; cached data wins.
    if (catalogue.isPending) {
      return (
        <>
          {header}
          <ProductGridSkeleton />
        </>
      );
    }
    if (catalogue.isError && products.length === 0) {
      return (
        <ErrorStateView
          message={
            getErrorMessage(catalogue.error) ?? "Couldn't load products."
          }
          onRetry={() => catalogue.refetch()}
        />
      );
    }
    return (
      <ProductGrid
        products={products}
        quantityOf={cart.quantityOf}
        isWishlisted={wishlist.isWishlisted}
        onIncrease={cart.increase}
        onDecrease={cart.decrease}
        onToggleWishlist={(product) => wishlist.toggle(product.id)}
        onPressIn={prefetch}
        ListHeaderComponent={header}
        isFetchingNextPage={catalogue.isFetchingNextPage}
        onEndReached={() => {
          if (catalogue.hasNextPage && !catalogue.isFetchingNextPage)
            catalogue.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={catalogue.isRefetching && !catalogue.isFetchingNextPage}
            onRefresh={() => catalogue.refetch()}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <OfflineBanner visible={!isOnline} />
      <View style={styles.container}>{renderBody()}</View>

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={["90%"]}
        enableDynamicSizing={false}
        handleComponent={() => (
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Profile
            </Text>
            <TouchableOpacity
              onPress={() => sheetRef.current?.close()}
              accessibilityRole="button"
              accessibilityLabel="Close profile"
            >
              <Text style={styles.sheetDoneButton}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      >
        <ProfileSheet />
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", paddingHorizontal: 16 },
  categoryItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  categoryItemText: { fontSize: 14, fontWeight: "600" },
  sheetHeader: {
    height: 50,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: "600" },
  sheetDoneButton: { fontSize: 16, color: storeColors.accent },
  buttonPressed: { opacity: 0.5 },
});
