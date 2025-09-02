import { Category } from "@/src/models/Product";

export const queryKeys = {
  product: (id: number) => ["product", id] as const,
  products: ["products"] as const,
  categories: ["categories"] as const,
  productsByCategory: (category: Category) =>
    ["product-by-category", category] as const,
  carts: (userId: number) => ["carts", userId] as const,
  user: (id: string) => ["user", id] as const,
  users: ["users"] as const,
};
