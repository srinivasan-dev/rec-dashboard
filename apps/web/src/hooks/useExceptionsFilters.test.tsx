import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { useExceptionsFilters } from './useExceptionsFilters';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter
      initialEntries={['/']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {children}
    </MemoryRouter>
  );
}

describe('useExceptionsFilters', () => {
  it('defaults to page 1, pageSize 10, sortBy transactionDate, sortOrder asc', () => {
    const { result } = renderHook(() => useExceptionsFilters(), { wrapper });

    expect(result.current[0]).toEqual({
      page: 1,
      pageSize: 10,
      sortBy: 'transactionDate',
      sortOrder: 'asc',
      showMatched: false,
    });
  });

  it('writes a changed reason filter into the URL and resets to page 1', () => {
    const { result } = renderHook(() => useExceptionsFilters(), { wrapper });

    act(() => {
      result.current[1]({ reason: 'AMOUNT_MISMATCH' });
    });

    expect(result.current[0]).toMatchObject({ reason: 'AMOUNT_MISMATCH', page: 1 });
  });

  it('preserves other filters when only the page changes', () => {
    const { result } = renderHook(() => useExceptionsFilters(), { wrapper });

    act(() => {
      result.current[1]({ reason: 'DATE_MISMATCH' });
    });
    act(() => {
      result.current[1]({ page: 2 });
    });

    expect(result.current[0]).toMatchObject({ reason: 'DATE_MISMATCH', page: 2 });
  });

  it('omits default values from the URL so the link stays clean', () => {
    const { result } = renderHook(() => useExceptionsFilters(), { wrapper });

    act(() => {
      result.current[1]({ reason: 'AMOUNT_MISMATCH' });
    });
    act(() => {
      // Switching back to "all types" should remove reason from the URL, not set it to empty.
      result.current[1]({ reason: undefined });
    });

    expect(result.current[0].reason).toBeUndefined();
  });
});
