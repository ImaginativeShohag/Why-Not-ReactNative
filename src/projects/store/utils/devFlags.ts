import { create } from "zustand";

import type { SimulatedOutcome } from "../models/Payment";

/**
 * Dev-menu switches for deliberately experiencing the failure modes the
 * project is about. In-memory only: a relaunch always returns to normal.
 * The account tab only renders the menu outside production builds.
 */
type DevFlagsState = {
  /** Answer the first attempt of every store request with a synthetic 401. */
  forceUnauthorized: boolean;
  /** Make the next token refresh fail, to exercise logout-on-refresh-failure. */
  failNextRefresh: boolean;
  /** Make wishlist writes fail, to watch the optimistic rollback. */
  failWishlistWrites: boolean;
  /** Outcome of the simulated payment processor. */
  simulatedPaymentOutcome: SimulatedOutcome;
  set: (patch: Partial<Omit<DevFlagsState, "set">>) => void;
};

export const useDevFlags = create<DevFlagsState>((set) => ({
  forceUnauthorized: false,
  failNextRefresh: false,
  failWishlistWrites: false,
  simulatedPaymentOutcome: "succeed",
  set: (patch) => set(patch),
}));

/** Non-React read for interceptors and api facades. */
export const getDevFlags = () => useDevFlags.getState();
