import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  type CheckoutEvent,
  type CheckoutState,
  initialCheckoutState,
  transition,
} from "./checkoutMachine";

type CheckoutStore = CheckoutState & {
  send: (event: CheckoutEvent) => void;
};

/** The machine, persisted so a force-quit at any step resumes in place. */
export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set, get) => ({
      ...initialCheckoutState,
      send: (event) => {
        const { send: _send, ...current } = get();
        set(transition(current, event));
      },
    }),
    {
      name: "store.checkout",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ send: _send, ...state }) => state,
    },
  ),
);
