import type { ReconciliationException } from '@rapyd-portal/shared';

import { buildDeterministicExplanation } from './deterministicExplanation';

function exception(reason: ReconciliationException['reason']): ReconciliationException {
  return {
    merchantId: 'M-104',
    transactionId: 'T1',
    reason,
    currency: 'USD',
    settlement: null,
    ledger: null,
    duplicateLedgerEntries: null,
    differenceMinorUnits: null,
  };
}

describe('buildDeterministicExplanation', () => {
  it('is tagged as the fallback, never as a provider-generated explanation', () => {
    const result = buildDeterministicExplanation(exception('AMOUNT_MISMATCH'));

    expect(result.generatedBy).toBe('fallback');
  });

  it('returns calm, non-alarming text for every reason -- never "missing"/"lost" money framing', () => {
    const reasons: ReconciliationException['reason'][] = [
      'MISSING_LEDGER',
      'MISSING_SETTLEMENT',
      'DUPLICATE_LEDGER',
      'AMOUNT_MISMATCH',
      'DATE_MISMATCH',
      'CURRENCY_MISMATCH',
    ];

    for (const reason of reasons) {
      const result = buildDeterministicExplanation(exception(reason));

      expect(result.explanationText.length).toBeGreaterThan(0);
      expect(result.explanationText.toLowerCase()).not.toMatch(
        /money is missing|lost|fraud|stolen/,
      );
      expect(result.explanationText).toMatch(/review/i);
    }
  });

  it('is a pure function of the reason -- the same reason always produces the same text', () => {
    const first = buildDeterministicExplanation(exception('DATE_MISMATCH'));
    const second = buildDeterministicExplanation(exception('DATE_MISMATCH'));

    expect(first.explanationText).toBe(second.explanationText);
  });
});
