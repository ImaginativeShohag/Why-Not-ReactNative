import type { Product } from "../models/Product";
import { type Cents, toCents } from "../utils/money";

export type CartItem = Product & { quantity: number };

/** A server cart line: FakeStoreAPI (and most commerce APIs) store ids, not products. */
export type ServerCartLine = { productId: number; quantity: number };

export const MAX_QUANTITY_PER_ITEM = 10;

const clampQuantity = (quantity: number) =>
  Math.max(0, Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(quantity)));

export const lineTotalCents = (item: CartItem): Cents =>
  toCents(item.price) * item.quantity;

export const subtotalCents = (items: CartItem[]): Cents =>
  items.reduce((sum, item) => sum + lineTotalCents(item), 0);

export const itemCount = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export function addItem(items: CartItem[], product: Product): CartItem[] {
  const existing = items.find((i) => i.id === product.id);
  if (!existing) return [...items, { ...product, quantity: 1 }];
  return items.map((i) =>
    i.id === product.id ? { ...i, quantity: clampQuantity(i.quantity + 1) } : i,
  );
}

export function changeQuantity(
  items: CartItem[],
  id: number,
  delta: number,
): CartItem[] {
  return items
    .map((i) =>
      i.id === id ? { ...i, quantity: clampQuantity(i.quantity + delta) } : i,
    )
    .filter((i) => i.quantity > 0);
}

/**
 * Merge rule applied when a guest cart meets the server cart on sign-in:
 *
 * 1. Union by product id — nothing the user added on either side is lost.
 * 2. For a product on both sides take the MAX quantity, not the sum. The
 *    common case is the same cart synced earlier from this device; summing
 *    would double it on every sign-in.
 * 3. The server's product data (price, title) wins — it is fresher than
 *    whatever was persisted locally days ago.
 * 4. Server lines whose product can no longer be resolved (delisted) drop.
 * 5. Quantities are clamped to MAX_QUANTITY_PER_ITEM.
 *
 * Local order is preserved, then server-only lines are appended.
 */
export function mergeCarts(
  local: CartItem[],
  server: ServerCartLine[],
  resolveProduct: (productId: number) => Product | undefined,
): CartItem[] {
  const serverById = new Map<number, number>();
  for (const line of server) {
    serverById.set(
      line.productId,
      Math.max(serverById.get(line.productId) ?? 0, line.quantity),
    );
  }

  const merged: CartItem[] = local.map((item) => {
    const serverQuantity = serverById.get(item.id);
    if (serverQuantity === undefined) return item;
    const fresh = resolveProduct(item.id);
    return {
      ...(fresh ?? item),
      quantity: clampQuantity(Math.max(item.quantity, serverQuantity)),
    };
  });

  const localIds = new Set(local.map((i) => i.id));
  for (const [productId, quantity] of serverById) {
    if (localIds.has(productId)) continue;
    const product = resolveProduct(productId);
    if (!product) continue;
    const clamped = clampQuantity(quantity);
    if (clamped > 0) merged.push({ ...product, quantity: clamped });
  }

  return merged;
}

export const toServerLines = (items: CartItem[]): ServerCartLine[] =>
  items.map((i) => ({ productId: i.id, quantity: i.quantity }));
