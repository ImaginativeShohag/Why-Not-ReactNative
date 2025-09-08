import { useQuery } from "@tanstack/react-query";
import {
  fetchCarts,
  fetchCategories,
  fetchProductDetails,
  fetchProducts,
  fetchProductsByCategory,
  loginUser,
} from "@/src/api/endpoints/product.api";
import { queryKeys } from "@/src/utils/queryKeys";
import { Category } from "@/src/models/Product";
import { LoginPayload } from "@/src/models/Auth";
import { DetailedCartItem } from "@/src/models/CartItem";

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

export const useLoginUser = (credentials: LoginPayload) => {
  return useQuery({
    queryKey: queryKeys.loginUser(credentials),
    queryFn: () => loginUser(credentials),
  });
};

// export const useUpdateUser = (id: string) => {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: (payload: any) => updateUser(id, payload),
//     onSuccess: () => {
//       // Invalidate cache to refetch
//       queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
//     },
//   });
// };
