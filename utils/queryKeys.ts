export const queryKeys = {
  product: (id: string) => ["product", id] as const,
  products: ["products"] as const,
  user: (id: string) => ["user", id] as const,
  users: ["users"] as const,
};
