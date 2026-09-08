import { act, renderHook } from '@testing-library/react';

import { useMediaQuery } from './useMediaQuery';

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();

  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => false,
  }));

  return {
    setMatches: (next: boolean) => {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('useMediaQuery', () => {
  it('returns the current match state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 599px)'));
    expect(result.current).toBe(true);
  });

  it('reacts to a simulated change event', () => {
    const { setMatches } = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 599px)'));
    expect(result.current).toBe(false);

    act(() => setMatches(true));

    expect(result.current).toBe(true);
  });
});
