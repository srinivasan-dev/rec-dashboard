import { parseAmountToMinorUnits } from './money';
import type { LedgerRecord, SettlementRecord } from './types';

/**
 * Pure CSV-text -> row-object parsing. No file I/O (no `fs`) — reading the actual files from
 * disk is the API's repository layer (Phase 4), which is the only place that needs Node's
 * filesystem. This function only needs a string, so it stays usable from a test, a script, or
 * a future non-Express context without dragging Node-specific APIs into `packages/shared`.
 *
 * Deliberately minimal: no quoted-field or embedded-comma support, since the provided CSVs
 * don't need it. A production CSV source would use a real parser (e.g. `csv-parse`) here.
 */
export function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const header = lines[0]!.split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

export function toSettlementRecord(row: Record<string, string>): SettlementRecord {
  return {
    settlementId: row.settlement_id ?? '',
    transactionId: row.transaction_id ?? '',
    merchantId: row.merchant_id ?? '',
    transactionDate: row.transaction_date ?? '',
    settlementDate: row.settlement_date ?? '',
    currency: row.currency ?? '',
    grossAmountMinorUnits: parseAmountToMinorUnits(row.gross_amount ?? '0'),
    feeAmountMinorUnits: parseAmountToMinorUnits(row.fee_amount ?? '0'),
    netAmountMinorUnits: parseAmountToMinorUnits(row.net_amount ?? '0'),
    status: row.status ?? '',
  };
}

export function toLedgerRecord(row: Record<string, string>): LedgerRecord {
  return {
    ledgerId: row.ledger_id ?? '',
    transactionId: row.transaction_id ?? '',
    merchantId: row.merchant_id ?? '',
    transactionDate: row.transaction_date ?? '',
    currency: row.currency ?? '',
    amountMinorUnits: parseAmountToMinorUnits(row.amount ?? '0'),
    status: row.status ?? '',
  };
}

export function parseSettlementCsv(csvText: string): SettlementRecord[] {
  return parseCsv(csvText).map(toSettlementRecord);
}

export function parseLedgerCsv(csvText: string): LedgerRecord[] {
  return parseCsv(csvText).map(toLedgerRecord);
}
