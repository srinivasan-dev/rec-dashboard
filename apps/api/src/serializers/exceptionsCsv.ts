import type { ReconciliationException } from '@rapyd-portal/shared';

import { toExportRow } from './exceptionsExportRows';

const HEADER = [
  'transaction_id',
  'reason',
  'currency',
  'settlement_net_amount',
  'ledger_amount',
  'difference_amount',
  'transaction_date',
].join(',');

/** Quotes a CSV cell only when it contains a character that would otherwise break the format. */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toExceptionsCsv(exceptions: ReconciliationException[]): string {
  const rows = exceptions.map((exception) => toExportRow(exception).map(csvCell).join(','));
  return [HEADER, ...rows].join('\n');
}
