import { useQuery } from "@tanstack/react-query";

import { productsQuery, useCategories } from "./useProduct";
import { useDebouncedValue } from "./useDebouncedValue";

const MIN_LENGTH = 2;

/**
 * Debounced product search. FakeStoreAPI has no search endpoint, so this
 * reads the one shared catalogue query and filters it during render: one
 * request, then instant, with no per-term copies of the catalogue in cache.
 */
export function useSearch(term: string) {
  const debounced = useDebouncedValue(term.trim().toLowerCase(), 300);
  const enabled = debounced.length >= MIN_LENGTH;

  const products = useQuery({ ...productsQuery, enabled });
  const results =
    enabled && products.data
      ? products.data.filter(
          (p) =>
            p.title.toLowerCase().includes(debounced) ||
            p.category.toLowerCase().includes(debounced) ||
            p.description.toLowerCase().includes(debounced),
        )
      : [];

  const { data: categories = [] } = useCategories();
  const suggestions = enabled
    ? categories.filter((c) => c.toLowerCase().includes(debounced))
    : [];

  return {
    debouncedTerm: debounced,
    isActive: enabled,
    isTyping: term.trim().toLowerCase() !== debounced,
    results,
    isFetching: products.isFetching,
    error: products.error,
    suggestions,
  };
}
