import {
  fetchCarts,
  fetchCategories,
  fetchProductDetails,
  fetchProducts,
  fetchProductsByCategory,
} from "@/src/projects/store/api/product.api";
import { DetailedCartItem } from "@/src/projects/store/models/CartItem";
import { Category } from "@/src/projects/store/models/Product";
import { queryKeys } from "@/src/projects/store/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export const useProducts = () => {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: () => fetchProducts(),
  });
};

export const useProductDetails = (id: number) => {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => fetchProductDetails(id),
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => fetchCategories(),
  });
};

export const useProductsByCategory = (category: Category) => {
  return useQuery({
    queryKey: queryKeys.productsByCategory(category),
    queryFn: () => fetchProductsByCategory(category),
  });
};

export const useCarts = (userId: number) => {
  return useQuery({
    queryKey: queryKeys.carts(userId),
    queryFn: () => fetchCarts(userId),
  });
};

export const useOrders = (userId: number) => {
  const { data: carts } = useCarts(userId);

  return useQuery({
    queryKey: queryKeys.orders(userId),
    enabled: !!carts,
    queryFn: async () => {
      if (!carts) return [];

      const detailedCarts = await Promise.all(
        carts.map(async (cart) => {
          const detailedProducts = await Promise.all(
            cart.products.map(async (product) => {
              const details = await fetchProductDetails(product.productId);
              return {
                ...details,
                quantity: product.quantity,
              };
            }),
          );

          return {
            ...cart,
            products: detailedProducts,
          } as DetailedCartItem;
        }),
      );

      return detailedCarts as DetailedCartItem[];
    },
  });
};
