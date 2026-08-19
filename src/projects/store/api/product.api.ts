import { CartItem } from "@/src/projects/store/models/CartItem";
import { Category, Product } from "@/src/projects/store/models/Product";
import axios from "../../../shared/api/axios";

/*
✅ Rule of thumb:
	•	GET → fetchX
	•	POST (create) → createX or action verb (loginUser, uploadFile)
	•	PUT/PATCH → updateX
	•	DELETE → deleteX
 */

export const fetchProducts = async (): Promise<[Product]> => {
  const { data } = await axios.get(`/products`);
  return data;
};

export const fetchProductDetails = async (id: number): Promise<Product> => {
  const { data } = await axios.get(`/products/${id}`);
  return data;
};

export const fetchCategories = async (): Promise<[Category]> => {
  const { data } = await axios.get(`/products/categories`);
  return data;
};

export const fetchProductsByCategory = async (
  category: Category,
): Promise<[Product]> => {
  const { data } = await axios.get(`/products/category/${category}`);
  return data;
};

export const fetchCarts = async (userId: number): Promise<[CartItem]> => {
  const { data } = await axios.get("/carts", {
    params: { userId },
  });
  return data;
};
