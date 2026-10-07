import type { ServerCart } from "../models/CartItem";
import type { ServerCartLine } from "../stores/cartMath";
import { storeApi } from "./client";

/** The user's most recent server cart, as id + quantity lines. */
export const fetchServerCart = async (
  userId: number,
): Promise<{ cartId: number | null; lines: ServerCartLine[] }> => {
  const { data } = await storeApi.get<ServerCart[]>(`/carts/user/${userId}`);
  const latest = [...data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  return {
    cartId: latest?.id ?? null,
    lines: latest?.products ?? [],
  };
};

/** Pushes the merged cart back so the next device sees it too. */
export const updateServerCart = async (
  userId: number,
  cartId: number | null,
  lines: ServerCartLine[],
) => {
  const body = { userId, date: new Date().toISOString(), products: lines };
  if (cartId === null) {
    await storeApi.post("/carts", body);
  } else {
    await storeApi.put(`/carts/${cartId}`, body);
  }
};

/** FakeStoreAPI cart history — shown as legacy, already-delivered orders. */
export const fetchCartHistory = async (
  userId: number,
): Promise<ServerCart[]> => {
  const { data } = await storeApi.get<ServerCart[]>("/carts", {
    params: { userId },
  });
  return data;
};
