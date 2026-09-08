import { reconcile, reconcileMerchant } from './reconcile';
import { parseAmountToMinorUnits } from './money';
import type { LedgerRecord, SettlementRecord } from './types';

function settlement(overrides: Partial<SettlementRecord> = {}): SettlementRecord {
  return {
    settlementId: 'S1',
    transactionId: 'T1',
    merchantId: 'M-104',
    transactionDate: '2026-07-01',
    settlementDate: '2026-07-02',
    currency: 'AED',
    grossAmountMinorUnits: parseAmountToMinorUnits('267.80'),
    feeAmountMinorUnits: parseAmountToMinorUnits('10.00'),
    netAmountMinorUnits: parseAmountToMinorUnits('257.80'),
    status: 'settled',
    ...overrides,
  };
}

function ledger(overrides: Partial<LedgerRecord> = {}): LedgerRecord {
  return {
    ledgerId: 'L1',
    transactionId: 'T1',
    merchantId: 'M-104',
    transactionDate: '2026-07-01',
    currency: 'AED',
    amountMinorUnits: parseAmountToMinorUnits('257.80'),
    status: 'posted',
    ...overrides,
  };
}

describe('reconcile', () => {
  it('matches a transaction when settlement and ledger agree on amount, currency, and date', () => {
    const result = reconcileMerchant([settlement()], [ledger()], 'M-104');

    expect(result.exceptions).toHaveLength(0);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({ merchantId: 'M-104', transactionId: 'T1' });
    expect(result.summary).toMatchObject({
      totalChecked: 1,
      matchedCount: 1,
      exceptionCount: 0,
      financialImpactByCurrency: [],
    });
  });

  it('flags MISSING_LEDGER when a settlement has no corresponding ledger entry', () => {
    const result = reconcileMerchant([settlement()], [], 'M-104');

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]).toMatchObject({
      reason: 'MISSING_LEDGER',
      settlement: expect.objectContaining({ transactionId: 'T1' }),
      ledger: null,
    });
    // Financial impact for a missing ledger entry is the settlement's net amount.
    expect(result.summary.financialImpactByCurrency).toEqual([
      { currency: 'AED', amountMinorUnits: parseAmountToMinorUnits('257.80') },
    ]);
  });

  it('flags MISSING_SETTLEMENT when a ledger entry has no corresponding settlement', () => {
    const result = reconcileMerchant([], [ledger()], 'M-104');

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]).toMatchObject({
      reason: 'MISSING_SETTLEMENT',
      settlement: null,
      ledger: expect.objectContaining({ transactionId: 'T1' }),
    });
    expect(result.summary.financialImpactByCurrency).toEqual([
      { currency: 'AED', amountMinorUnits: parseAmountToMinorUnits('257.80') },
    ]);
  });

  it('flags DUPLICATE_LEDGER when more than one ledger entry shares merchantId + transactionId', () => {
    const result = reconcileMerchant(
      [settlement()],
      [ledger({ ledgerId: 'L2' }), ledger({ ledgerId: 'L1' })],
      'M-104',
    );

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]!.reason).toBe('DUPLICATE_LEDGER');
    // Deterministic: lowest ledgerId first, both entries preserved for the merchant to inspect.
    expect(result.exceptions[0]!.duplicateLedgerEntries).toEqual([
      expect.objectContaining({ ledgerId: 'L1' }),
      expect.objectContaining({ ledgerId: 'L2' }),
    ]);
    // No financial impact number for duplicates — ambiguous whether the money doubled.
    expect(result.summary.financialImpactByCurrency).toEqual([]);
  });

  it('does not also raise AMOUNT_MISMATCH against a duplicate that happens to disagree in amount', () => {
    // Regression test for the precedence rule: a naive join would compare the settlement
    // against *each* duplicate ledger entry and could raise a spurious AMOUNT_MISMATCH here.
    const result = reconcileMerchant(
      [settlement()],
      [
        ledger({ ledgerId: 'L1' }),
        ledger({ ledgerId: 'L2', amountMinorUnits: parseAmountToMinorUnits('99.00') }),
      ],
      'M-104',
    );

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]!.reason).toBe('DUPLICATE_LEDGER');
  });

  it('flags AMOUNT_MISMATCH when settlement net amount differs from ledger amount', () => {
    const result = reconcileMerchant(
      [settlement({ netAmountMinorUnits: parseAmountToMinorUnits('267.80') })],
      [ledger({ amountMinorUnits: parseAmountToMinorUnits('243.49') })],
      'M-104',
    );

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]).toMatchObject({
      reason: 'AMOUNT_MISMATCH',
      differenceMinorUnits: parseAmountToMinorUnits('24.31'),
    });
    expect(result.summary.financialImpactByCurrency).toEqual([
      { currency: 'AED', amountMinorUnits: parseAmountToMinorUnits('24.31') },
    ]);
  });

  it('flags DATE_MISMATCH when amount and currency agree but transaction dates differ', () => {
    const result = reconcileMerchant(
      [settlement({ transactionDate: '2026-07-01' })],
      [ledger({ transactionDate: '2026-07-03' })],
      'M-104',
    );

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]).toMatchObject({ reason: 'DATE_MISMATCH' });
    // A date-only difference has no quantifiable amount discrepancy.
    expect(result.summary.financialImpactByCurrency).toEqual([]);
  });

  it('flags CURRENCY_MISMATCH when settlement and ledger currencies differ, checked before amount comparison', () => {
    const result = reconcileMerchant(
      [settlement({ currency: 'USD', netAmountMinorUnits: parseAmountToMinorUnits('257.80') })],
      [ledger({ currency: 'AED', amountMinorUnits: parseAmountToMinorUnits('257.80') })],
      'M-104',
    );

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0]).toMatchObject({
      reason: 'CURRENCY_MISMATCH',
      differenceMinorUnits: null,
    });
  });

  it("never mixes one merchant's records into another merchant's result (merchant isolation)", () => {
    const settlements = [
      settlement({ merchantId: 'M-104', transactionId: 'T1' }),
      settlement({ merchantId: 'M-105', transactionId: 'T1', settlementId: 'S2' }),
    ];
    const ledgers = [ledger({ merchantId: 'M-104', transactionId: 'T1' })];
    // M-105's T1 has no ledger entry at all -- M-104's T1 is fully matched.

    const results = reconcile(settlements, ledgers);

    const m104 = results.get('M-104')!;
    expect(m104.matched).toHaveLength(1);
    expect(m104.exceptions).toHaveLength(0);

    const m105 = results.get('M-105')!;
    expect(m105.matched).toHaveLength(0);
    expect(m105.exceptions).toHaveLength(1);
    expect(m105.exceptions[0]!.reason).toBe('MISSING_LEDGER');

    // Same transactionId on both merchants never cross-contaminates the other's bucket.
    expect(m104.exceptions.some((e) => e.merchantId !== 'M-104')).toBe(false);
    expect(m105.matched.some((t) => t.merchantId !== 'M-105')).toBe(false);
  });

  it('reconciles on merchantId + transactionId, not transactionId alone', () => {
    // Same transactionId "T9", different merchants, different amounts -- must not cross-match.
    const result = reconcile(
      [
        settlement({ merchantId: 'M-104', transactionId: 'T9', netAmountMinorUnits: 10000 }),
        settlement({
          merchantId: 'M-106',
          transactionId: 'T9',
          netAmountMinorUnits: 50000,
          settlementId: 'S9',
        }),
      ],
      [
        ledger({ merchantId: 'M-104', transactionId: 'T9', amountMinorUnits: 10000 }),
        ledger({
          merchantId: 'M-106',
          transactionId: 'T9',
          amountMinorUnits: 50000,
          ledgerId: 'L9',
        }),
      ],
    );

    expect(result.get('M-104')!.matched).toHaveLength(1);
    expect(result.get('M-106')!.matched).toHaveLength(1);
    expect(result.get('M-104')!.exceptions).toHaveLength(0);
    expect(result.get('M-106')!.exceptions).toHaveLength(0);
  });

  it('uses exact integer minor-unit comparison for money, never float equality', () => {
    // 0.1 + 0.2 !== 0.3 in floating point; expressed in minor units these must compare exactly
    // equal, with no AMOUNT_MISMATCH raised due to float drift.
    const oneAndTwoTenths = parseAmountToMinorUnits('0.10') + parseAmountToMinorUnits('0.20');
    const threeTenths = parseAmountToMinorUnits('0.30');
    expect(oneAndTwoTenths).toBe(threeTenths);

    const result = reconcileMerchant(
      [settlement({ netAmountMinorUnits: threeTenths })],
      [ledger({ amountMinorUnits: oneAndTwoTenths })],
      'M-104',
    );

    expect(result.exceptions).toHaveLength(0);
    expect(result.matched).toHaveLength(1);
  });

  it('detects a one-minor-unit amount difference precisely (money precision)', () => {
    const result = reconcileMerchant(
      [settlement({ netAmountMinorUnits: parseAmountToMinorUnits('100.00') })],
      [ledger({ amountMinorUnits: parseAmountToMinorUnits('99.99') })],
      'M-104',
    );

    expect(result.exceptions[0]).toMatchObject({
      reason: 'AMOUNT_MISMATCH',
      differenceMinorUnits: 1,
    });
  });

  it('groups financial impact by currency and never sums across currencies', () => {
    const result = reconcileMerchant(
      [
        settlement({
          transactionId: 'T1',
          currency: 'AED',
          netAmountMinorUnits: parseAmountToMinorUnits('100.00'),
        }),
        settlement({
          transactionId: 'T2',
          currency: 'USD',
          settlementId: 'S2',
          netAmountMinorUnits: parseAmountToMinorUnits('50.00'),
        }),
      ],
      [],
      'M-104',
    );

    expect(result.summary.financialImpactByCurrency).toEqual(
      expect.arrayContaining([
        { currency: 'AED', amountMinorUnits: parseAmountToMinorUnits('100.00') },
        { currency: 'USD', amountMinorUnits: parseAmountToMinorUnits('50.00') },
      ]),
    );
    expect(result.summary.financialImpactByCurrency).toHaveLength(2);
  });
});
