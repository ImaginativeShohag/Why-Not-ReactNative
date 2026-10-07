import { itemCount } from "./cartMath";
import { useCartStore } from "./cartStore";

export const useItemCount = () =>
  useCartStore((state) => itemCount(state.items));
