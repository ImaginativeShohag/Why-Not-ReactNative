import type { Category, Product, ProductPage } from "../models/Product";
import { storeApi } from "./client";

/*
 Naming rule of thumb:
   GET → fetchX · POST (create) → createX or an action verb · PUT/PATCH → updateX · DELETE → deleteX
*/

export const PRODUCT_PAGE_SIZE = 6;

export const fetchProducts = async (): Promise<Product[]> => {
  const { data } = await storeApi.get<Product[]>("/products");
  return data;
};

export const fetchProductDetails = async (id: number): Promise<Product> => {
  const { data } = await storeApi.get<Product>(`/products/${id}`);
  return data;
};

export const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await storeApi.get<Category[]>("/products/categories");
  return data;
};

/**
 * FakeStoreAPI has `?limit=` but no offset, so paging is emulated: page n asks
 * for the first (n + 1) * size items and keeps the last `size`. A real API
 * would take a cursor; the hook above this doesn't care which.
 */
export const fetchProductPage = async (
  page: number,
  category?: Category,
  size = PRODUCT_PAGE_SIZE,
): Promise<ProductPage> => {
  const limit = (page + 1) * size;
  const path = category
    ? `/products/category/${encodeURIComponent(category)}`
    : "/products";
  const { data } = await storeApi.get<Product[]>(path, { params: { limit } });
  const items = data.slice(page * size, limit);
  return {
    items,
    nextPage: data.length >= limit ? page + 1 : undefined,
  };
};
