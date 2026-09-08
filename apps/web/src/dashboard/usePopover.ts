import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Minimal disclosure behavior shared by the filter/sort/export icon menus and the date range
 * picker: closes on Escape or a click outside the trigger+panel pair. Deliberately not a full
 * focus trap (see ExceptionDrawer for that) -- these are small, single-purpose menus, not a
 * modal workflow, so returning focus to the trigger and dismiss-on-outside-click is enough
 * (the same bar a native `<select>` clears).
 */
export function usePopover<T extends HTMLElement>(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  containerRef: RefObject<T>;
} {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((value) => !value),
    containerRef,
  };
}
