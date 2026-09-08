import '@testing-library/jest-dom';

// jsdom doesn't implement matchMedia. Default matches:false so every existing test keeps
// exercising desktop behavior (useIsMobile/useIsTabletOrBelow both resolve false) unless a test
// explicitly overrides window.matchMedia to assert mobile/tablet behavior.
if (!window.matchMedia) {
  window.matchMedia = function matchMedia(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}
