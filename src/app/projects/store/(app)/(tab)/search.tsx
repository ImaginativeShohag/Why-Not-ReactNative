import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import ProductImage from "@/src/projects/store/components/ui/product-image";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import { usePrefetchProduct } from "@/src/projects/store/hooks/useProduct";
import { useSearch } from "@/src/projects/store/hooks/useSearch";
import { useSearchStore } from "@/src/projects/store/stores/searchStore";
import { track } from "@/src/projects/store/utils/analytics";
import { formatPrice } from "@/src/projects/store/utils/money";
import { storeColors } from "@/src/projects/store/constants/theme";

export default function SearchScreen() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const search = useSearch(term);
  const prefetch = usePrefetchProduct();
  const { recents, addRecent, removeRecent, clearRecents } = useSearchStore();

  useEffect(() => {
    if (search.isActive && !search.isFetching) {
      track("search", {
        term_length: search.debouncedTerm.length,
        result_count: search.results.length,
      });
    }
  }, [
    search.isActive,
    search.isFetching,
    search.debouncedTerm,
    search.results.length,
  ]);

  return (
    <View style={styles.flex}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={storeColors.muted} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search products"
          placeholderTextColor={storeColors.muted}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search products"
          onSubmitEditing={() => addRecent(term)}
          testID="search-input"
        />
        {search.isFetching || search.isTyping ? (
          <ActivityIndicator size="small" />
        ) : null}
      </View>

      {!search.isActive ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {recents.length > 0 ? (
            <>
              <View style={styles.rowBetween}>
                <SectionHeader title="Recent searches" />
                <Pressable onPress={clearRecents} accessibilityRole="button">
                  <Text style={styles.link}>Clear</Text>
                </Pressable>
              </View>
              {recents.map((recent) => (
                <View key={recent} style={styles.recentRow}>
                  <Pressable
                    style={styles.recentMain}
                    onPress={() => setTerm(recent)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search for ${recent}`}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={storeColors.muted}
                    />
                    <Text style={styles.recentText}>{recent}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeRecent(recent)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${recent} from recent searches`}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={storeColors.muted}
                    />
                  </Pressable>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.hint}>
              Search by name, category or description.
            </Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={search.results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          // Previous results stay visible while the next term loads
          // (placeholderData), so the list never flashes empty mid-typing.
          style={search.isTyping ? styles.dimmed : undefined}
          ListHeaderComponent={
            search.suggestions.length > 0 ? (
              <View style={styles.chips}>
                {search.suggestions.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.chip}
                    accessibilityRole="link"
                    onPress={() =>
                      router.push({
                        pathname: "/projects/store/products/[categoryId]",
                        params: { categoryId: category },
                      })
                    }
                  >
                    <Text style={styles.chipText}>{category}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            search.error ? (
              <Text style={styles.hint}>{getErrorMessage(search.error)}</Text>
            ) : search.isFetching ? null : (
              <Text style={styles.hint}>
                No products match “{search.debouncedTerm}”.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Link
              href={{
                pathname: "/projects/store/product/[id]",
                params: { id: item.id },
              }}
              asChild
            >
              <Pressable
                onPressIn={() => prefetch(item)}
                onPress={() => addRecent(term)}
                style={({ pressed }) => [
                  styles.result,
                  pressed && styles.dimmed,
                ]}
                accessibilityRole="link"
                accessibilityLabel={`${item.title}, ${formatPrice(item.price)}`}
              >
                <ProductImage image={item.image} style={styles.thumb} />
                <View style={styles.flex}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultPrice}>
                    {formatPrice(item.price)}
                  </Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(120,120,128,0.12)",
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 10 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  link: { color: storeColors.accent, fontSize: 15, marginBottom: 6 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
  },
  recentMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  recentText: { fontSize: 16 },
  hint: {
    color: storeColors.muted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 32,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,122,255,0.12)",
  },
  chipText: { color: storeColors.accent, fontWeight: "600" },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  resultTitle: { fontSize: 15, fontWeight: "500" },
  resultPrice: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  dimmed: { opacity: 0.6 },
});
