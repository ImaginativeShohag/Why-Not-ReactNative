import axios from "../axios";
import { Product } from "@/models/Product";

export const fetchProducts = async (): Promise<[Product]> => {
  const { data } = await axios.get(`/products`);
  return data;
};

export const fetchProductDetails = async (id: string): Promise<Product> => {
  const { data } = await axios.get(`/products/${id}`);
  return data;
};

export const fetchUser = async (id: string) => {
  const { data } = await axios.get(`/users/${id}`);
  return data;
};

export const updateUser = async (id: string, payload: any) => {
  const { data } = await axios.put(`/users/${id}`, payload);
  return data;
};
