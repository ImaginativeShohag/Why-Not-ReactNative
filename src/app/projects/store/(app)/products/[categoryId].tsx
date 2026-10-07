import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import OfflineBanner from "@/src/projects/store/components/ui/OfflineBanner";
import ProductGrid from "@/src/projects/store/components/ui/ProductGrid";
import { ProductGridSkeleton } from "@/src/projects/store/components/ui/Skeleton";
import { useCartActions } from "@/src/projects/store/hooks/useCartActions";
import {
  useInfiniteProducts,
  usePrefetchProduct,
} from "@/src/projects/store/hooks/useProduct";
import { useWishlist } from "@/src/projects/store/hooks/useWishlist";
import { useIsOnline } from "@/src/projects/store/query/storeQuery";
import { capitalize } from "@/src/projects/store/utils/text";

export default function CategoryProductsScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const insets = useSafeAreaInsets();
  const isOnline = useIsOnline();
  const cart = useCartActions();
  const prefetch = usePrefetchProduct();
  const wishlist = useWishlist((message) => Alert.alert("Wishlist", message));
  const query = useInfiniteProducts(categoryId);
  const products = query.data ?? [];

  const title = categoryId ? capitalize(categoryId) : "Products";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      <OfflineBanner visible={!isOnline} />
      {query.isPending ? (
        <ProductGridSkeleton />
      ) : query.isError && products.length === 0 ? (
        <ErrorStateView
          message={getErrorMessage(query.error) ?? "Couldn't load products."}
          onRetry={() => query.refetch()}
        />
      ) : (
        <ProductGrid
          products={products}
          quantityOf={cart.quantityOf}
          isWishlisted={wishlist.isWishlisted}
          onIncrease={cart.increase}
          onDecrease={cart.decrease}
          onToggleWishlist={(product) => wishlist.toggle(product.id)}
          onPressIn={prefetch}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          isFetchingNextPage={query.isFetchingNextPage}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage)
              query.fetchNextPage();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
