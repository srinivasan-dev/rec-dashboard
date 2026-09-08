import type { ReconciliationException } from '@rapyd-portal/shared';

import { buildExplanationContext } from './explanationProvider';
import { MockExplanationProvider } from './mockExplanationProvider';

function exception(overrides: Partial<ReconciliationException>): ReconciliationException {
  return {
    merchantId: 'M-104',
    transactionId: 'T1013',
    reason: 'AMOUNT_MISMATCH',
    currency: 'USD',
    settlement: null,
    ledger: null,
    duplicateLedgerEntries: null,
    differenceMinorUnits: null,
    ...overrides,
  };
}

const provider = new MockExplanationProvider();

describe('MockExplanationProvider', () => {
  it('identifies itself as "mock" so the response can be told apart from the deterministic fallback', () => {
    expect(provider.id).toBe('mock');
  });

  it('grounds an AMOUNT_MISMATCH explanation in the actual settlement/ledger amounts, not a canned string', async () => {
    const context = buildExplanationContext(
      exception({
        reason: 'AMOUNT_MISMATCH',
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
        differenceMinorUnits: 2431,
      }),
    );

    const text = await provider.explain(context);

    expect(text).toContain('267.80');
    expect(text).toContain('243.49');
    expect(text).toContain('24.31');
    expect(text).toContain('T1013');
  });

  it('grounds a DUPLICATE_LEDGER explanation in the actual duplicate count', async () => {
    const context = buildExplanationContext(
      exception({
        reason: 'DUPLICATE_LEDGER',
        transactionId: 'T1008',
        duplicateLedgerEntries: [
          {
            ledgerId: 'L7007',
            transactionId: 'T1008',
            merchantId: 'M-104',
            transactionDate: '2026-07-03',
            currency: 'EUR',
            amountMinorUnits: 166537,
            status: 'posted',
          },
          {
            ledgerId: 'L7052',
            transactionId: 'T1008',
            merchantId: 'M-104',
            transactionDate: '2026-07-03',
            currency: 'EUR',
            amountMinorUnits: 166537,
            status: 'posted',
          },
        ],
      }),
    );

    const text = await provider.explain(context);

    expect(text).toContain('2');
    expect(text).toContain('T1008');
  });

  it('never speculates about fraud, missing funds, or liability -- only supplied facts', async () => {
    const reasons: ReconciliationException['reason'][] = [
      'MISSING_LEDGER',
      'MISSING_SETTLEMENT',
      'DUPLICATE_LEDGER',
      'AMOUNT_MISMATCH',
      'DATE_MISMATCH',
      'CURRENCY_MISMATCH',
    ];

    for (const reason of reasons) {
      const context = buildExplanationContext(
        exception({
          reason,
          settlement: {
            settlementId: 'S1',
            transactionId: 'T1',
            merchantId: 'M-104',
            transactionDate: '2026-07-01',
            settlementDate: '2026-07-02',
            currency: 'USD',
            grossAmountMinorUnits: 1000,
            feeAmountMinorUnits: 0,
            netAmountMinorUnits: 1000,
            status: 'settled',
          },
          ledger: {
            ledgerId: 'L1',
            transactionId: 'T1',
            merchantId: 'M-104',
            transactionDate: '2026-07-01',
            currency: 'USD',
            amountMinorUnits: 1000,
            status: 'posted',
          },
        }),
      );

      const text = await provider.explain(context);

      expect(text.toLowerCase()).not.toMatch(/fraud|stolen|lost|missing funds|liabilit/);
    }
  });
});
