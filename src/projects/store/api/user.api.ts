import type { User } from "../models/User";
import { storeApi } from "./client";

export const fetchUserProfile = async (id: number): Promise<User> => {
  const { data } = await storeApi.get<User>(`/users/${id}`);
  return data;
};
