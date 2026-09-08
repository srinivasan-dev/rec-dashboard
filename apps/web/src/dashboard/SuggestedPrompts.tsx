import { useAppDispatch } from '../store/hooks';
import { searchDraftPrefilled } from '../store/uiSlice';
import styles from './SuggestedPrompts.module.css';

/** A mix of literal (keyword) and natural-language example queries -- same spirit as
 *  GlobalSearchBar's typewriter placeholder, but clickable: picking one runs it immediately
 *  rather than just showing what's possible. */
const SUGGESTED_PROMPTS = [
  'Why is my money not showing up?',
  'Show me duplicate entries',
  'Which transactions need review?',
  'Amount mismatches',
];

/**
 * Sits under the centered search bar (SearchHero.tsx) as a running start for a merchant unsure
 * what to ask. Picking a chip fills GlobalSearchBar's draft (via `searchDraftPrefilled`) the same
 * as if the merchant had typed it -- it deliberately does not submit on their behalf; they still
 * press the search button (or Enter) to run it.
 */
export function SuggestedPrompts(): JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <div className={styles.row} role="group" aria-label="Suggested searches">
      <span className={styles.label} aria-hidden="true">
        Suggested:
      </span>
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className={styles.chip}
          onClick={() => dispatch(searchDraftPrefilled(prompt))}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
