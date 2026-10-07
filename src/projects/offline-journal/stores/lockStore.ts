import { create } from "zustand";

type LockState = {
  /** Needs authentication before content is shown. */
  locked: boolean;
  /**
   * App is not in the foreground. Content is covered — but no prompt — so the
   * OS app-switcher snapshot never contains a journal entry.
   */
  obscured: boolean;
  lock: () => void;
  unlock: () => void;
  setObscured: (obscured: boolean) => void;
};

// Starts locked. The gate decides whether to prompt, based on settings.
export const useLockStore = create<LockState>((set) => ({
  locked: true,
  obscured: false,
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
  setObscured: (obscured) => set({ obscured }),
}));
