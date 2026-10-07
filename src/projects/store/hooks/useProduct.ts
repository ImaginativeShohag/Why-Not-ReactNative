import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchCategories,
  fetchProductDetails,
  fetchProductPage,
  fetchProducts,
} from "../api/product.api";
import type { Category, Product } from "../models/Product";
import { queryKeys } from "../utils/queryKeys";

/** The full catalogue — shared so every reader hits the same cache entry. */
export const productsQuery = queryOptions({
  queryKey: queryKeys.products.list(),
  queryFn: fetchProducts,
});

export const useProducts = () => useQuery(productsQuery);

/**
 * Infinite catalogue. Pages are small so the "load more" path is visible on
 * FakeStoreAPI's 20 products.
 */
export const useInfiniteProducts = (category?: Category) =>
  useInfiniteQuery({
    queryKey: queryKeys.products.infinite(category ? { category } : {}),
    queryFn: ({ pageParam }) => fetchProductPage(pageParam, category),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => data.pages.flatMap((p) => p.items),
    placeholderData: keepPreviousData,
  });

export const useProductDetails = (id: number) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => fetchProductDetails(id),
    enabled: Number.isFinite(id) && id > 0,
    // Paint instantly from any list that already holds this product.
    // Placeholder data never enters the cache, so the detail request still
    // runs and replaces it.
    placeholderData: () =>
      queryClient
        .getQueryData(productsQuery.queryKey)
        ?.find((p) => p.id === id),
  });
};

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
  });

/**
 * Seeds the detail cache for a product and starts the detail request, called
 * on list-item press-in.
 */
export const usePrefetchProduct = () => {
  const queryClient = useQueryClient();
  return (product: Product) => {
    // The list already has everything the detail screen needs to paint.
    // `updatedAt: 0` marks the seed as already stale: stamped "now", it would
    // satisfy the 60s staleTime below and the detail request would never run.
    if (!queryClient.getQueryData(queryKeys.products.detail(product.id))) {
      queryClient.setQueryData(queryKeys.products.detail(product.id), product, {
        updatedAt: 0,
      });
    }
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(product.id),
      queryFn: () => fetchProductDetails(product.id),
      staleTime: 60 * 1000,
    });
  };
};
