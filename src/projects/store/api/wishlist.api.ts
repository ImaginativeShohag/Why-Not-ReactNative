import { hasBackend } from "../constants/config";
import { getDevFlags } from "../utils/devFlags";
import { backendApi } from "./client";
import { mockServer } from "./mockServer";

/**
 * Api-shaped wishlist facade. The hooks treat it as a remote resource (so
 * the optimistic toggle + rollback is the real pattern); without a backend
 * it is backed by the persisted on-device mock server.
 */
export type WishlistOwner = number | "guest";

const ownerKey = (owner: WishlistOwner) => String(owner);

export async function fetchWishlist(owner: WishlistOwner): Promise<number[]> {
  if (hasBackend() && owner !== "guest") {
    const { data } = await backendApi.get<number[]>("/wishlist");
    return data;
  }
  return mockServer.getWishlist(ownerKey(owner));
}

export async function updateWishlist(
  owner: WishlistOwner,
  productId: number,
  wishlisted: boolean,
): Promise<number[]> {
  if (hasBackend() && owner !== "guest") {
    const { data } = wishlisted
      ? await backendApi.put<number[]>(`/wishlist/${productId}`)
      : await backendApi.delete<number[]>(`/wishlist/${productId}`);
    return data;
  }
  return mockServer.setWishlisted(
    ownerKey(owner),
    productId,
    wishlisted,
    getDevFlags().failWishlistWrites,
  );
}
