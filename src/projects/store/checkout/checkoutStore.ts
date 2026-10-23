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
  /**
   * Sign-out only: RESET keeps a saved address for the next checkout, which
   * must not carry over to the next person on this device.
   */
  forgetSavedAddress: () => void;
};

/** The machine, persisted so a force-quit at any step resumes in place. */
export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set, get) => ({
      ...initialCheckoutState,
      send: (event) => {
        const { send: _send, forgetSavedAddress: _forget, ...current } = get();
        set(transition(current, event));
      },
      forgetSavedAddress: () =>
        set({
          address: initialCheckoutState.address,
          saveAddress: initialCheckoutState.saveAddress,
        }),
    }),
    {
      name: "store.checkout",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ send: _send, forgetSavedAddress: _forget, ...state }) =>
        state,
    },
  ),
);
