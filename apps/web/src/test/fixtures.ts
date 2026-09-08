import type { ExceptionDto, ExceptionsListResponse, SummaryDto } from '../api/types';

export const ALL_CLEAR_SUMMARY: SummaryDto = {
  merchantId: 'M-104',
  totalChecked: 9,
  matchedCount: 9,
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
};

export const AMOUNT_MISMATCH_EXCEPTION: ExceptionDto = {
  id: 'T1013',
  merchantId: 'M-104',
  transactionId: 'T1013',
  reason: 'AMOUNT_MISMATCH',
  currency: 'USD',
  settlement: {
    settlementId: 'S5013',
    transactionDate: '2026-07-08',
    settlementDate: '2026-07-09',
    currency: 'USD',
    grossAmount: '276.83',
    feeAmount: '9.03',
    netAmount: '267.80',
    status: 'settled',
  },
  ledger: {
    ledgerId: 'L7012',
    transactionDate: '2026-07-08',
    currency: 'USD',
    amount: '243.49',
    status: 'posted',
  },
  duplicateLedgerEntries: null,
  differenceAmount: '24.31',
};

export const DUPLICATE_LEDGER_EXCEPTION: ExceptionDto = {
  id: 'T1008',
  merchantId: 'M-104',
  transactionId: 'T1008',
  reason: 'DUPLICATE_LEDGER',
  currency: 'EUR',
  settlement: {
    settlementId: 'S5008',
    transactionDate: '2026-07-03',
    settlementDate: '2026-07-05',
    currency: 'EUR',
    grossAmount: '1716.14',
    feeAmount: '50.77',
    netAmount: '1665.37',
    status: 'settled',
  },
  ledger: {
    ledgerId: 'L7007',
    transactionDate: '2026-07-03',
    currency: 'EUR',
    amount: '1665.37',
    status: 'posted',
  },
  duplicateLedgerEntries: [
    {
      ledgerId: 'L7007',
      transactionDate: '2026-07-03',
      currency: 'EUR',
      amount: '1665.37',
      status: 'posted',
    },
    {
      ledgerId: 'L7052',
      transactionDate: '2026-07-03',
      currency: 'EUR',
      amount: '1665.37',
      status: 'posted',
    },
  ],
  differenceAmount: null,
};

export const POPULATED_SUMMARY: SummaryDto = {
  ...ALL_CLEAR_SUMMARY,
  totalChecked: 14,
  matchedCount: 9,
  exceptionCount: 5,
  exceptionsByReason: { ...ALL_CLEAR_SUMMARY.exceptionsByReason, AMOUNT_MISMATCH: 1 },
  financialImpactByCurrency: [{ currency: 'USD', amount: '24.31' }],
};

export const EXCEPTIONS_RESPONSE: ExceptionsListResponse = {
  data: [AMOUNT_MISMATCH_EXCEPTION],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};
