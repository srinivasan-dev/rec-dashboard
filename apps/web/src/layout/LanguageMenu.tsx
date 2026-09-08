import { useState } from 'react';

import popover from '../dashboard/Popover.module.css';
import { usePopover } from '../dashboard/usePopover';
import styles from './AppShell.module.css';

interface LanguageOption {
  code: 'en' | 'ar';
  label: string;
  nativeLabel: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
];

/**
 * Placeholder only -- picking Arabic here just changes which option shows a checkmark, nothing
 * else on the page actually changes (no RTL layout, no translated copy). Multilingual support
 * itself isn't being built yet; this exists so the affordance is visible in the header for
 * review, ready to wire up to a real i18n layer later without moving where it lives.
 */
export function LanguageMenu(): JSX.Element {
  const { isOpen, toggle, close, containerRef } = usePopover<HTMLDivElement>();
  const [selected, setSelected] = useState<LanguageOption['code']>('en');
  const current = LANGUAGE_OPTIONS.find((option) => option.code === selected)!;

  return (
    <div className={popover.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.languageMenuTrigger}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Language: ${current.label}`}
        title="Multilingual support is under construction — coming in a future release."
        onClick={toggle}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M1.5 8h13M8 1.5c1.8 1.8 2.7 4 2.7 6.5S9.8 12.7 8 14.5C6.2 12.7 5.3 10.5 5.3 8S6.2 3.3 8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        {current.code.toUpperCase()}
      </button>

      {isOpen ? (
        <div className={popover.panel} role="menu" aria-label="Choose language">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              role="menuitemradio"
              aria-checked={option.code === selected}
              className={popover.menuItem}
              onClick={() => {
                setSelected(option.code);
                close();
              }}
            >
              <span className={styles.languageMenuCheck} aria-hidden="true">
                {option.code === selected ? '✓' : ''}
              </span>
              {option.nativeLabel}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
