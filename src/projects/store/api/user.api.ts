import axiosInstance from "@/src/shared/api/axios";
import { User } from "../models/User";

/**
 * Real FakeStoreAPI version — note `address` is an object there, so the
 * `User` model needs updating before switching over:
 */
export const fetchUserProfile = async (id: number): Promise<User> => {
  const { data } = await axiosInstance.get(`/users/${id}`);
  return data;
};
