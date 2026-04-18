import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RealtimeProvider from "../realtime/RealtimeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </QueryClientProvider>
  );
}

export { AppProviders, queryClient };
