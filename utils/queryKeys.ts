export const queryKeys = {
  product: (id: number) => ["product", id] as const,
  products: ["products"] as const,
  categories: ["categories"] as const,
  user: (id: string) => ["user", id] as const,
  users: ["users"] as const,
};
