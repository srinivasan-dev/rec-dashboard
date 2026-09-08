import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  parseLedgerCsv,
  parseSettlementCsv,
  reconcile,
  type ReconciliationResult,
} from '@rapyd-portal/shared';

// data/ lives at the repo root -- 4 levels above this file whether run from src/ (ts-jest,
// tsx) or dist/ (built output), since both mirror the same repositories/ nesting.
const DATA_DIR = resolve(__dirname, '../../../../data');

let cachedResultsByMerchant: Map<string, ReconciliationResult> | null = null;

function loadResults(): Map<string, ReconciliationResult> {
  if (cachedResultsByMerchant) return cachedResultsByMerchant;

  const settlementCsv = readFileSync(resolve(DATA_DIR, 'settlement_export.csv'), 'utf-8');
  const ledgerCsv = readFileSync(resolve(DATA_DIR, 'ledger_export.csv'), 'utf-8');

  const settlements = parseSettlementCsv(settlementCsv);
  const ledgerEntries = parseLedgerCsv(ledgerCsv);

  cachedResultsByMerchant = reconcile(settlements, ledgerEntries);
  return cachedResultsByMerchant;
}

function emptyResult(merchantId: string): ReconciliationResult {
  return {
    merchantId,
    matched: [],
    exceptions: [],
    summary: {
      merchantId,
      totalChecked: 0,
      matchedCount: 0,
      exceptionCount: 0,
      exceptionsByReason: {
        MISSING_LEDGER: 0,
        MISSING_SETTLEMENT: 0,
        DUPLICATE_LEDGER: 0,
        AMOUNT_MISMATCH: 0,
        DATE_MISMATCH: 0,
        CURRENCY_MISMATCH: 0,
      },
      financialImpactByCurrency: [],
    },
  };
}

/**
 * Reads and reconciles the CSVs once per process, then serves every request from the cached
 * result (see docs/architecture.md §9 -- no database in this phase). A production version would
 * swap this for a database-backed repository behind the same signature; callers (the service
 * layer) would not need to change.
 */
export function getReconciliationResult(merchantId: string): ReconciliationResult {
  const results = loadResults();
  return results.get(merchantId) ?? emptyResult(merchantId);
}
