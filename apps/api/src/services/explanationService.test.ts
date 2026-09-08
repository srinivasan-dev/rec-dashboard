import type { ReconciliationException } from '@rapyd-portal/shared';

import { buildDeterministicExplanation } from './deterministicExplanation';
import type { ExceptionExplanationProvider, ExplanationContext } from './explanationProvider';
import { getExplanation } from './explanationService';

const EXCEPTION: ReconciliationException = {
  merchantId: 'M-104',
  transactionId: 'T1013',
  reason: 'AMOUNT_MISMATCH',
  currency: 'USD',
  settlement: null,
  ledger: null,
  duplicateLedgerEntries: null,
  differenceMinorUnits: null,
};

function stubProvider(
  explain: (context: ExplanationContext) => Promise<string>,
): ExceptionExplanationProvider {
  return { id: 'test-provider', explain };
}

describe('getExplanation', () => {
  it('uses the default MockExplanationProvider and tags the response with its id', async () => {
    const result = await getExplanation(EXCEPTION);

    expect(result.generatedBy).toBe('mock');
    expect(result.explanationText.length).toBeGreaterThan(0);
  });

  it('returns the provider text as-is, tagged with the provider id, when it is usable', async () => {
    const provider = stubProvider(
      async () => 'The amounts differ by 24.31 USD for transaction T1013.',
    );

    const result = await getExplanation(EXCEPTION, provider);

    expect(result).toEqual({
      explanationText: 'The amounts differ by 24.31 USD for transaction T1013.',
      generatedBy: 'test-provider',
    });
  });

  it('falls back to the deterministic explanation when the provider throws', async () => {
    const provider = stubProvider(async () => {
      throw new Error('LLM API timeout');
    });

    const result = await getExplanation(EXCEPTION, provider);

    expect(result).toEqual(buildDeterministicExplanation(EXCEPTION));
  });

  it('falls back when the provider returns text containing speculative/alarming language', async () => {
    const provider = stubProvider(
      async () => 'It looks like funds may have been lost or there was fraud.',
    );

    const result = await getExplanation(EXCEPTION, provider);

    expect(result).toEqual(buildDeterministicExplanation(EXCEPTION));
  });

  it('falls back when the provider returns text that is too short to be a real explanation', async () => {
    const provider = stubProvider(async () => 'ok');

    const result = await getExplanation(EXCEPTION, provider);

    expect(result).toEqual(buildDeterministicExplanation(EXCEPTION));
  });

  it('falls back when the provider returns implausibly long output', async () => {
    const provider = stubProvider(async () => 'x'.repeat(1000));

    const result = await getExplanation(EXCEPTION, provider);

    expect(result).toEqual(buildDeterministicExplanation(EXCEPTION));
  });

  it('never throws, even when the provider rejects', async () => {
    const provider = stubProvider(() => Promise.reject(new Error('network down')));

    await expect(getExplanation(EXCEPTION, provider)).resolves.toBeDefined();
  });
});
