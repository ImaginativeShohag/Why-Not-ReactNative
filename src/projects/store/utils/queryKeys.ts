import type { ProductFilters } from "../models/Product";

/**
 * Hierarchical query-key factory. Every key starts with "store" because one
 * QueryClient is shared by every project in this repo: the prefix makes
 * `invalidateQueries({ queryKey: queryKeys.all })`, persistence filtering
 * (`shouldDehydrateQuery`) and logout cleanup reach only the store's cache.
 *
 *   invalidate(queryKeys.products.all)      → everything product-shaped
 *   invalidate(queryKeys.orders.detail(id)) → just this one
 *
 * There is no key for login: a login is a mutation, and a password has no
 * business in a cache key.
 */
const ROOT = "store" as const;

export const queryKeys = {
  all: [ROOT] as const,

  products: {
    all: [ROOT, "products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: ProductFilters = {}) =>
      [...queryKeys.products.lists(), filters] as const,
    infinite: (filters: ProductFilters = {}) =>
      [...queryKeys.products.all, "infinite", filters] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.products.details(), id] as const,
  },

  categories: {
    all: [ROOT, "categories"] as const,
  },

  orders: {
    all: [ROOT, "orders"] as const,
    list: (userId: number) =>
      [...queryKeys.orders.all, "list", userId] as const,
    detail: (id: string) => [...queryKeys.orders.all, "detail", id] as const,
  },

  wishlist: {
    all: [ROOT, "wishlist"] as const,
    ids: (userId: number | "guest") =>
      [...queryKeys.wishlist.all, "ids", userId] as const,
  },

  user: {
    all: [ROOT, "user"] as const,
    profile: (id: number) => [...queryKeys.user.all, "profile", id] as const,
  },
};

/**
 * Keys that must never be written to disk: profile data is PII, and the next
 * person to sign in on this device must not see it.
 */
export const isSensitiveKey = (queryKey: readonly unknown[]) =>
  queryKey[0] === ROOT && queryKey[1] === "user";

export const isStoreKey = (queryKey: readonly unknown[]) =>
  queryKey[0] === ROOT;
