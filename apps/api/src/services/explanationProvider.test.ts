import type { ReconciliationException } from '@rapyd-portal/shared';

import {
  buildExplanationContext,
  buildExplanationPrompt,
  EXPLANATION_SYSTEM_INTENT,
} from './explanationProvider';

const AMOUNT_MISMATCH: ReconciliationException = {
  merchantId: 'M-104',
  transactionId: 'T1013',
  reason: 'AMOUNT_MISMATCH',
  currency: 'USD',
  settlement: {
    settlementId: 'S5013',
    transactionId: 'T1013',
    merchantId: 'M-104',
    transactionDate: '2026-07-08',
    settlementDate: '2026-07-09',
    currency: 'USD',
    grossAmountMinorUnits: 27683,
    feeAmountMinorUnits: 903,
    netAmountMinorUnits: 26780,
    status: 'settled',
  },
  ledger: {
    ledgerId: 'L7012',
    transactionId: 'T1013',
    merchantId: 'M-104',
    transactionDate: '2026-07-08',
    currency: 'USD',
    amountMinorUnits: 24349,
    status: 'posted',
  },
  duplicateLedgerEntries: null,
  differenceMinorUnits: 2431,
};

const MISSING_LEDGER: ReconciliationException = {
  merchantId: 'M-104',
  transactionId: 'T1006',
  reason: 'MISSING_LEDGER',
  currency: 'AED',
  settlement: {
    settlementId: 'S5006',
    transactionId: 'T1006',
    merchantId: 'M-104',
    transactionDate: '2026-07-01',
    settlementDate: '2026-07-02',
    currency: 'AED',
    grossAmountMinorUnits: 138466,
    feeAmountMinorUnits: 0,
    netAmountMinorUnits: 138466,
    status: 'settled',
  },
  ledger: null,
  duplicateLedgerEntries: null,
  differenceMinorUnits: null,
};

describe('buildExplanationContext', () => {
  it('converts minor units to decimal strings via the money module, never via float math', () => {
    const context = buildExplanationContext(AMOUNT_MISMATCH);

    expect(context.settlement).toEqual({ amount: '267.80', date: '2026-07-08' });
    expect(context.ledger).toEqual({ amount: '243.49', date: '2026-07-08' });
    expect(context.differenceAmount).toBe('24.31');
  });

  it('represents a missing side as null rather than a placeholder amount', () => {
    const context = buildExplanationContext(MISSING_LEDGER);

    expect(context.ledger).toBeNull();
    expect(context.settlement).toEqual({ amount: '1384.66', date: '2026-07-01' });
  });
});

describe('buildExplanationPrompt', () => {
  it('includes the fixed system intent verbatim', () => {
    const prompt = buildExplanationPrompt(buildExplanationContext(AMOUNT_MISMATCH));

    expect(prompt).toContain(EXPLANATION_SYSTEM_INTENT);
  });

  it('lists only the structured facts, not free-form exception data', () => {
    const prompt = buildExplanationPrompt(buildExplanationContext(AMOUNT_MISMATCH));

    expect(prompt).toContain('transactionId: T1013');
    expect(prompt).toContain('reason: AMOUNT_MISMATCH');
    expect(prompt).toContain('settlement: 267.80 USD on 2026-07-08');
    expect(prompt).toContain('ledger: 243.49 USD on 2026-07-08');
    expect(prompt).toContain('difference: 24.31 USD');
  });

  it('marks a missing side as "none on record" rather than omitting it silently', () => {
    const prompt = buildExplanationPrompt(buildExplanationContext(MISSING_LEDGER));

    expect(prompt).toContain('ledger: none on record');
  });
});
