import axios from "@/src/shared/api/axios";
import { LoginPayload } from "../models/Auth";

export const loginUser = async (credentials: LoginPayload) => {
  const { data } = await axios.post(`/auth/login`, credentials);
  return data;
};
