import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

// The hydration flag never changes after mount, so there is nothing to subscribe to.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): "light" | "dark" {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme === "dark" ? "dark" : "light";
  }

  return "light";
}
