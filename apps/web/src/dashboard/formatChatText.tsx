import type { ReactNode } from 'react';

const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

/**
 * The mock/fallback explanation providers write their emphasis as literal markdown
 * (`**Transaction T1008**`) -- this renders just that one construct as real `<strong>` markup
 * instead of showing the asterisks verbatim. Deliberately minimal (bold only, no links/lists/
 * headings): explanationService.ts only ever emits this one pattern, so anything more would be
 * unused surface area, not future-proofing.
 */
export function formatChatText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  BOLD_PATTERN.lastIndex = 0;
  while ((match = BOLD_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = BOLD_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
