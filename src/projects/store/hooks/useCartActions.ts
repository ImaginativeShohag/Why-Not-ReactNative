import type { Product } from "../models/Product";
import { MAX_QUANTITY_PER_ITEM } from "../stores/cartMath";
import { useCartStore } from "../stores/cartStore";
import { track } from "../utils/analytics";
import { toCents } from "../utils/money";

/** Screen-level cart actions with analytics, shared by every product list. */
export function useCartActions() {
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const quantityOf = (productId: number) =>
    items.find((i) => i.id === productId)?.quantity ?? 0;

  const increase = (product: Product) => {
    const current = quantityOf(product.id);
    if (current >= MAX_QUANTITY_PER_ITEM) return;
    addToCart(product);
    track("add_to_cart", {
      product_id: product.id,
      price_cents: toCents(product.price),
      quantity: current + 1,
    });
  };

  const decrease = (product: Product) => {
    const current = quantityOf(product.id);
    if (current === 0) return;
    updateQuantity(product.id, -1);
    if (current === 1) track("remove_from_cart", { product_id: product.id });
  };

  return { quantityOf, increase, decrease };
}
