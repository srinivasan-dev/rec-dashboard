import type { ExceptionExplanationProvider, ExplanationContext } from './explanationProvider';

/**
 * Stands in for a real LLM call (see docs/ai-design.md). Synthesizes a grounded, per-reason
 * explanation from `ExplanationContext` alone -- every sentence traces back to a supplied fact
 * (amount, date, currency, count), never to anything inferred. This is what makes it a
 * reasonable stand-in for "a real LLM provider could later replace this": the shape it's bound
 * by (facts in, calm factual prose out, no speculation) is exactly what the system-intent prompt
 * in `explanationProvider.ts` asks a real LLM to honor too.
 */
export class MockExplanationProvider implements ExceptionExplanationProvider {
  readonly id = 'mock';

  async explain(context: ExplanationContext): Promise<string> {
    switch (context.reason) {
      case 'MISSING_LEDGER':
        return (
          `The processor settled ${context.settlement?.amount} ${context.currency} for ` +
          `transaction ${context.transactionId} on ${context.settlement?.date}, but there's no ` +
          `matching entry in your ledger. This needs review to confirm the transaction was recorded.`
        );
      case 'MISSING_SETTLEMENT':
        return (
          `Your ledger has an entry of ${context.ledger?.amount} ${context.currency} dated ` +
          `${context.ledger?.date} for transaction ${context.transactionId}, but no matching ` +
          `settlement was found from the processor. This may be a pending settlement, or it may need review.`
        );
      case 'DUPLICATE_LEDGER':
        return (
          `Transaction ${context.transactionId} appears in your ledger ` +
          `${context.duplicateLedgerCount ?? 'more than'} times for the same amount. This needs ` +
          `review to confirm whether it was recorded more than once.`
        );
      case 'AMOUNT_MISMATCH':
        return (
          `For transaction ${context.transactionId}, the processor settled ` +
          `${context.settlement?.amount} ${context.currency} but your ledger shows ` +
          `${context.ledger?.amount} ${context.currency} -- a difference of ` +
          `${context.differenceAmount} ${context.currency}. This needs review.`
        );
      case 'DATE_MISMATCH':
        return (
          `Transaction ${context.transactionId} settled on ${context.settlement?.date} but your ` +
          `ledger records it on ${context.ledger?.date}. This can happen with normal processing ` +
          `delays, or it may need review.`
        );
      case 'CURRENCY_MISMATCH':
        return (
          `Transaction ${context.transactionId} was settled in a different currency than the ` +
          `one recorded in your ledger. This needs review to confirm which currency is correct.`
        );
    }
  }
}
