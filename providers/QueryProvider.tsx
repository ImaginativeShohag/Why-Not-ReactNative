import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// For DevTools
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import("@tanstack/query-core").QueryClient;
  }
}

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
