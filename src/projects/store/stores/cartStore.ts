import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Product } from "../models/Product";
import {
  addItem,
  type CartItem,
  changeQuantity,
  mergeCarts,
  removeOrderedLines,
  type ServerCartLine,
} from "./cartMath";

export type { CartItem } from "./cartMath";

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  /** Removes an order's lines after purchase; later additions stay. */
  removePurchased: (lines: ServerCartLine[]) => void;
  /** Applies the documented merge rule (see `mergeCarts`) after sign-in. */
  mergeWithServer: (
    lines: ServerCartLine[],
    resolveProduct: (id: number) => Product | undefined,
  ) => CartItem[];
}

/**
 * Persisted locally so the bag survives a relaunch (and a force-quit mid
 * checkout); reconciled with the server cart on sign-in so it also survives
 * a reinstall or a second device.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product) =>
        set((state) => ({ items: addItem(state.items, product) })),
      updateQuantity: (id, delta) =>
        set((state) => ({ items: changeQuantity(state.items, id, delta) })),
      clearCart: () => set({ items: [] }),
      removePurchased: (lines) =>
        set((state) => ({ items: removeOrderedLines(state.items, lines) })),
      mergeWithServer: (lines, resolveProduct) => {
        const merged = mergeCarts(get().items, lines, resolveProduct);
        set({ items: merged });
        return merged;
      },
    }),
    {
      name: "store.cart",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
