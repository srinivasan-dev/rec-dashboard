import styles from './SearchChatPanel.module.css';

export interface ChatSuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

/**
 * Sits between the transcript and the composer (SearchChatPanel.tsx) -- 2-3 follow-up prompts,
 * regenerated from the merchant's current exception mix (chatSuggestedPrompts.ts), not a static
 * list. Same fill-not-submit behavior as the landing page's SuggestedPrompts: picking one drops it
 * into the composer's draft so the merchant still presses send.
 */
export function ChatSuggestedPrompts({
  prompts,
  onSelect,
}: ChatSuggestedPromptsProps): JSX.Element | null {
  if (prompts.length === 0) return null;

  return (
    <div className={styles.suggestions} role="group" aria-label="Suggested follow-ups">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className={styles.suggestionChip}
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
