import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import StickyFooter from "@/src/projects/store/components/checkout/StickyFooter";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import ProductImage from "@/src/projects/store/components/ui/product-image";
import QuantityStepper from "@/src/projects/store/components/ui/QuantityStepper";
import { SkeletonBlock } from "@/src/projects/store/components/ui/Skeleton";
import WishlistButton from "@/src/projects/store/components/ui/WishlistButton";
import { useCartActions } from "@/src/projects/store/hooks/useCartActions";
import {
  usePrefetchProduct,
  useProductDetails,
  useProducts,
} from "@/src/projects/store/hooks/useProduct";
import { useWishlist } from "@/src/projects/store/hooks/useWishlist";
import { MAX_QUANTITY_PER_ITEM } from "@/src/projects/store/stores/cartMath";
import { track } from "@/src/projects/store/utils/analytics";
import { formatPrice, toCents } from "@/src/projects/store/utils/money";
import { env } from "@/src/shared/constants/env";
import { storeColors } from "@/src/projects/store/constants/theme";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const {
    data: product,
    isPending,
    error,
    refetch,
  } = useProductDetails(productId);
  const { data: all = [] } = useProducts();
  const cart = useCartActions();
  const prefetch = usePrefetchProduct();
  const wishlist = useWishlist((message) => Alert.alert("Wishlist", message));
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (product) {
      track("view_product", {
        product_id: product.id,
        price_cents: toCents(product.price),
        category: product.category,
      });
    }
  }, [product]);

  if (!Number.isInteger(productId) || productId <= 0) {
    return (
      <ErrorStateView
        title="Product not found"
        message="This link doesn't point to a product."
      />
    );
  }

  if (isPending) {
    return (
      <View style={styles.skeleton}>
        <SkeletonBlock style={{ height: 300, borderRadius: 24 }} />
        <SkeletonBlock style={{ height: 22 }} />
        <SkeletonBlock style={{ height: 22, width: "40%" }} />
        <SkeletonBlock style={{ height: 80 }} />
      </View>
    );
  }

  if (error && !product) {
    return (
      <ErrorStateView
        message={getErrorMessage(error) ?? "Couldn't load this product."}
        onRetry={() => refetch()}
      />
    );
  }
  if (!product) return null;

  const quantity = cart.quantityOf(product.id);
  const related = all
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 6);
  const wishlisted = wishlist.isWishlisted(product.id);

  const share = () => {
    Share.share({
      message: `${product.title} — https://${env.linkDomain}/p/${product.id}`,
      url: `https://${env.linkDomain}/p/${product.id}`,
    });
  };

  return (
    <SafeAreaView style={styles.flex} edges={["left", "right"]}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View style={styles.headerActions}>
              <WishlistButton
                active={wishlisted}
                onPress={() => wishlist.toggle(product.id)}
              />
              <Pressable
                onPress={share}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Share product"
              >
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={storeColors.accent}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            accessibilityLabel={product.title}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.08)"]}
            style={styles.gradient}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            {product.title}
          </Text>
          <Text
            style={styles.rating}
            accessibilityLabel={`Rated ${product.rating.rate} out of 5 from ${product.rating.count} reviews`}
          >
            ★ {product.rating.rate.toFixed(1)} ·{" "}
            {product.rating.count.toLocaleString()} reviews
          </Text>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={styles.disclosure}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-forward"}
              size={18}
            />
            <Text style={styles.disclosureText}>Description</Text>
          </Pressable>
          {expanded ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          <View style={styles.disclosure}>
            <Ionicons name="cube-outline" size={18} />
            <Text style={styles.disclosureText}>
              Free standard shipping over {formatPrice(100)}
            </Text>
          </View>

          {related.length > 0 ? (
            <>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                You might also like
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={{
                      pathname: "/projects/store/product/[id]",
                      params: { id: p.id },
                    }}
                    asChild
                  >
                    <Pressable
                      onPressIn={() => prefetch(p)}
                      style={styles.related}
                      accessibilityRole="link"
                      accessibilityLabel={`${p.title}, ${formatPrice(p.price)}`}
                    >
                      <ProductImage
                        image={p.image}
                        style={styles.relatedImage}
                      />
                      <Text numberOfLines={2} style={styles.relatedTitle}>
                        {p.title}
                      </Text>
                      <Text style={styles.relatedPrice}>
                        {formatPrice(p.price)}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>

      <StickyFooter>
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerPrice}>{formatPrice(product.price)}</Text>
            <Text style={styles.stock}>
              {quantity > 0 ? `${quantity} in bag` : "In stock"}
            </Text>
          </View>
          {quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              onIncrease={() => cart.increase(product)}
              onDecrease={() => cart.decrease(product)}
              increaseDisabled={quantity >= MAX_QUANTITY_PER_ITEM}
              increaseLabel="Increase quantity"
              decreaseLabel="Decrease quantity"
              size="large"
              style={styles.stepper}
            />
          ) : (
            <PrimaryButton
              title="Add to bag"
              onPress={() => cart.increase(product)}
              style={{ flex: 1 }}
              testID="add-to-bag"
            />
          )}
        </View>
      </StickyFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  skeleton: { flex: 1, padding: 16, gap: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  imageContainer: {
    position: "relative",
    borderRadius: 32,
    overflow: "hidden",
  },
  image: { height: 300, resizeMode: "contain", margin: 16 },
  gradient: { position: "absolute", bottom: 0, height: 32, width: "100%" },
  content: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "600" },
  rating: { fontSize: 14, color: storeColors.secondaryText },
  price: { fontSize: 22, fontWeight: "700" },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  disclosureText: { fontSize: 16, fontWeight: "600" },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: storeColors.secondaryText,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 4,
  },
  related: { width: 130, gap: 4 },
  relatedImage: { width: 130, height: 130, borderRadius: 12 },
  relatedTitle: { fontSize: 13 },
  relatedPrice: { fontSize: 13, fontWeight: "700" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  footerPrice: { fontSize: 20, fontWeight: "700" },
  stock: { fontSize: 13, color: storeColors.success },
  stepper: { gap: 12 },
});
