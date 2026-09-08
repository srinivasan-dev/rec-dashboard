import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * `querySelectorAll` matches elements regardless of whether they're actually reachable by Tab --
 * critically, an element inside a `hidden` ancestor (like an inactive tab panel) still matches
 * `[tabindex]:not(...)` even though a real Tab keypress can never land on it. Checked via the
 * `hidden` attribute directly (not layout-based checks like `offsetParent`, which jsdom doesn't
 * compute) so this behaves identically under Jest and in a real browser. Without this filter, a
 * hidden element could end up being treated as the trap's "last" focusable node -- one a real Tab
 * press can never reach -- so the wrap-back-to-first logic below would never fire and focus would
 * escape the dialog entirely once real elements ran out. See docs/accessibility.md.
 */
function isReachable(element: HTMLElement): boolean {
  return element.closest('[hidden]') === null;
}

/**
 * The accessible-dialog pattern docs/product-spec.md §12 commits to: while `active`, moves
 * focus into the container, traps Tab/Shift+Tab cycling within it, and restores focus to
 * whatever was focused beforehand (the triggering "View details" button) once deactivated.
 * Hand-rolled rather than a dependency -- the trap logic itself is ~20 lines and this is the
 * only place in the app that needs it.
 */
export function useFocusTrap(active: boolean): RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const focusable = container
      ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isReachable)
      : [];
    (focusable[0] ?? container)?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Tab' || !container) return;

      const elements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(isReachable);
      if (elements.length === 0) return;
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [active]);

  return containerRef;
}
