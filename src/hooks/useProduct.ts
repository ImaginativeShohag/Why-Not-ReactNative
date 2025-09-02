import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCarts,
  fetchCategories,
  fetchProductDetails,
  fetchProducts,
  fetchProductsByCategory,
  fetchUser,
  updateUser,
} from "@/src/api/endpoints/product.api";
import { queryKeys } from "@/src/utils/queryKeys";
import { Category } from "@/src/models/Product";

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

export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => fetchUser(id),
  });
};

export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => updateUser(id, payload),
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
    },
  });
};
