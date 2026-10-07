import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ProductImage from "@/src/projects/store/components/ui/product-image";
import { ListSkeleton } from "@/src/projects/store/components/ui/Skeleton";
import WishlistButton from "@/src/projects/store/components/ui/WishlistButton";
import { useProducts } from "@/src/projects/store/hooks/useProduct";
import {
  useWishlist,
  useWishlistIds,
} from "@/src/projects/store/hooks/useWishlist";
import { formatPrice } from "@/src/projects/store/utils/money";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

export default function WishlistScreen() {
  const { isPending } = useWishlistIds();
  const { data: products = [], isPending: productsPending } = useProducts();
  const wishlist = useWishlist((message) => Alert.alert("Wishlist", message));

  if (isPending || productsPending) return <ListSkeleton rows={3} />;

  const items = products.filter((p) => wishlist.ids.has(p.id));

  if (items.length === 0) {
    return (
      <ContentUnavailableView
        iconComponent={Ionicons}
        iconName="heart-outline"
        title="No saved items"
        description="Tap the heart on any product to save it here."
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Link
            href={{
              pathname: "/projects/store/product/[id]",
              params: { id: item.id },
            }}
            asChild
          >
            <Pressable
              style={styles.main}
              accessibilityRole="link"
              accessibilityLabel={`${item.title}, ${formatPrice(item.price)}`}
            >
              <ProductImage image={item.image} style={styles.image} />
              <View style={styles.text}>
                <Text numberOfLines={2} style={styles.title}>
                  {item.title}
                </Text>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
              </View>
            </Pressable>
          </Link>
          {/* Optimistic: disappears instantly, comes back if the server rejects it. */}
          <WishlistButton active onPress={() => wishlist.toggle(item.id)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  image: { width: 64, height: 64, borderRadius: 10 },
  text: { flex: 1, gap: 4 },
  title: { fontSize: 15 },
  price: { fontSize: 15, fontWeight: "700" },
});
