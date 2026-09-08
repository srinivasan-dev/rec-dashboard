export interface HighlightProps {
  text: string;
  query: string | null | undefined;
}

/**
 * Wraps the first case-insensitive match of `query` inside `text` in a real `<mark>` (not a
 * styled `<span>`) so it's announced as emphasized text, not just visually distinct -- used by
 * ExceptionsTable while a global search is active (docs/sessions/
 * 2026-09-08-epic17-search-and-inline-detail.md).
 */
export function Highlight({ text, query }: HighlightProps): JSX.Element {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
