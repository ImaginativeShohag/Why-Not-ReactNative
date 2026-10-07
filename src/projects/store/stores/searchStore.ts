import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const MAX_RECENTS = 8;

interface SearchState {
  recents: string[];
  addRecent: (term: string) => void;
  removeRecent: (term: string) => void;
  clearRecents: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recents: [],
      addRecent: (term) => {
        const trimmed = term.trim();
        if (trimmed.length < 2) return;
        set((state) => ({
          recents: [
            trimmed,
            ...state.recents.filter(
              (r) => r.toLowerCase() !== trimmed.toLowerCase(),
            ),
          ].slice(0, MAX_RECENTS),
        }));
      },
      removeRecent: (term) =>
        set((state) => ({ recents: state.recents.filter((r) => r !== term) })),
      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: "store.search",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
