import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { store } from '../store/store';

/**
 * Every component under src/dashboard/ needs a QueryClient, the Redux store (for the
 * exception-drawer selection), and a router (for useSearchParams) -- this is the one place that
 * wiring is assembled for tests, so each test file doesn't repeat it.
 */
export function renderWithProviders(
  ui: ReactElement,
  initialEntries: string[] = ['/'],
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </ReduxProvider>
    </MemoryRouter>,
  );
}
