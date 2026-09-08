/**
 * The "Create support ticket" suggestion is a fixed sentinel string, not a real question --
 * `SearchChatTurn.tsx` matches on it exactly to render the ticket-confirmation response instead of
 * running the normal search/explain flow (a ticket isn't an exception-search query). There's no
 * ticketing backend yet (see `generateTicketNumber` below), so this is purely a UI affordance.
 */
export const SUPPORT_TICKET_PROMPT = 'Create a support ticket';

/** Not stored anywhere -- generates a plausible-looking reference number only. */
export function generateTicketNumber(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `RPD-${digits}`;
}
