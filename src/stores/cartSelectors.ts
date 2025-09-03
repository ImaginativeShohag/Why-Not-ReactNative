import { useCartStore } from "./cartStore";

export const useTotalPrice = () =>
  useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
