import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { ReactNode } from "react";
import { AppState, Platform } from "react-native";

// Exported so a project can attach its own persister or query defaults from
// its slice without mounting a second provider (a second cache).
export const queryClient = new QueryClient();

// React Native has no window focus or navigator.onLine, so TanStack Query's
// defaults never fire. These managers are process-global, so they are wired
// once here for every project: focus to AppState, online to expo-network.
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (state) => {
      setFocused(state === "active");
    });
    return () => sub.remove();
  });

  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((state) => setOnline(state.isConnected !== false))
      .catch(() => {});
    const sub = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false);
    });
    return () => sub.remove();
  });
}

// For DevTools
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import("@tanstack/query-core").QueryClient;
  }
}

// `window` doesn't exist while the web build is statically rendered in Node.
if (typeof window !== "undefined") {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
