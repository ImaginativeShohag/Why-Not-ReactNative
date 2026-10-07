import { create } from "zustand";

/**
 * The intent buffer. Anything that wants to take the user somewhere before
 * the app can honour it — a push tapped on cold start, a deep link to a
 * protected screen while signed out, a guest tapping "Checkout" — parks the
 * href here. The (app) layout replays it once BOTH the session has resolved
 * and the navigator is mounted. Without this the user signs in and lands on
 * Home, having lost what they tapped.
 */
type PendingIntentState = {
  href: string | null;
  /** True while the store's (app) navigator is mounted and able to replay. */
  appMounted: boolean;
  setPending: (href: string) => void;
  consume: () => string | null;
  setAppMounted: (mounted: boolean) => void;
};

export const usePendingIntent = create<PendingIntentState>((set, get) => ({
  href: null,
  appMounted: false,
  setPending: (href) => set({ href }),
  consume: () => {
    const { href } = get();
    if (href) set({ href: null });
    return href;
  },
  setAppMounted: (appMounted) => set({ appMounted }),
}));

export const setPendingIntent = (href: string) =>
  usePendingIntent.getState().setPending(href);
