import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
  ActivityIndicator,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { Product } from "../../models/Product";
import { formatPrice } from "../../utils/money";
import ProductView from "./product-item";

type ProductGridProps = {
  products: Product[];
  quantityOf: (productId: number) => number;
  isWishlisted: (productId: number) => boolean;
  onIncrease: (product: Product) => void;
  onDecrease: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  /** Fired on press-in, before navigation (used to prefetch the detail). */
  onPressIn: (product: Product) => void;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  ListHeaderComponent?: ReactElement;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/** Two-column masonry catalogue grid with infinite scroll. */
export default function ProductGrid({
  products,
  quantityOf,
  isWishlisted,
  onIncrease,
  onDecrease,
  onToggleWishlist,
  onPressIn,
  onEndReached,
  isFetchingNextPage,
  ListHeaderComponent,
  refreshControl,
  contentContainerStyle,
}: ProductGridProps) {
  const router = useRouter();
  return (
    <FlashList
      data={products}
      keyExtractor={(item) => String(item.id)}
      masonry
      numColumns={2}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={contentContainerStyle}
      onEndReachedThreshold={0.5}
      onEndReached={onEndReached}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={{ margin: 16 }} /> : null
      }
      refreshControl={refreshControl}
      renderItem={({ item: product }) => (
        <ProductView
          title={product.title}
          price={formatPrice(product.price)}
          image={product.image}
          rating={product.rating.rate}
          ratingCount={product.rating.count}
          quantity={quantityOf(product.id)}
          onPlusClick={() => onIncrease(product)}
          onMinusClick={() => onDecrease(product)}
          wishlisted={isWishlisted(product.id)}
          onToggleWishlist={() => onToggleWishlist(product)}
          // Prefetch on press-in: the ~100ms before press-out is free latency.
          onPressIn={() => onPressIn(product)}
          onPress={() =>
            router.push({
              pathname: "/projects/store/product/[id]",
              params: { id: product.id },
            })
          }
          testID={`product-${product.id}`}
        />
      )}
    />
  );
}
