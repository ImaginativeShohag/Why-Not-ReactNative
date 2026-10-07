import type { ServerCartLine } from "../stores/cartMath";

/** FakeStoreAPI `/carts` shape — used for order history and server-cart sync. */
export interface ServerCart {
  id: number;
  userId: number;
  // Example: 2020-03-02T00:00:00.000Z
  date: string;
  products: ServerCartLine[];
  __v?: number;
}
