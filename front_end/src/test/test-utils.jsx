import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(
  ui,
  { route = "/", queryClient = createTestQueryClient() } = {},
) {
  window.history.pushState({}, "Test page", route);

  return {
    queryClient,
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </MemoryRouter>,
    ),
  };
}

export { createTestQueryClient, renderWithProviders };
