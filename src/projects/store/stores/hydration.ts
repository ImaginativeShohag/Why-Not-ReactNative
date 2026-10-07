import { useCheckoutStore } from "../checkout/checkoutStore";
import { useCartStore } from "./cartStore";
import { useSearchStore } from "./searchStore";

const whenHydrated = (store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}) =>
  new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) return resolve();
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });

/**
 * AsyncStorage-backed Zustand stores hydrate asynchronously. Boot waits for
 * them so a cold start never renders an empty bag (or bounces a restored
 * checkout back to the bag) for one frame before the real state arrives.
 */
export const hydrateStoreState = () =>
  Promise.all([
    whenHydrated(useCartStore),
    whenHydrated(useCheckoutStore),
    whenHydrated(useSearchStore),
  ]).then(() => undefined);
