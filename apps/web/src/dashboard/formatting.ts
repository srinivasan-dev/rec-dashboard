import type { TransactionDto } from '../api/types';

/** Inserts thousands separators into a decimal string without ever parsing it as a float. */
export function formatCurrencyAmount(currency: string, decimalAmount: string): string {
  const negative = decimalAmount.startsWith('-');
  const unsigned = negative ? decimalAmount.slice(1) : decimalAmount;
  const [whole, fraction] = unsigned.split('.');
  const withThousands = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${negative ? '-' : ''}${withThousands}${fraction ? `.${fraction}` : ''}`;
}

/** The date a row is displayed under -- whichever side of the pair actually exists (a matched
 *  transaction always has both, and they always agree -- see reconcile.ts's DATE_MISMATCH rule). */
export function exceptionDate(exception: TransactionDto): string {
  return exception.settlement?.transactionDate ?? exception.ledger?.transactionDate ?? '';
}

/** A short "settlement vs. ledger" summary for the table's amount column. Collapses to a single
 *  value when both sides agree (always true for a matched row, since that's what "matched" means)
 *  -- an arrow between two identical amounts would just be visual noise. */
export function exceptionAmountSummary(exception: TransactionDto): string {
  const { settlement, ledger, currency } = exception;

  if (settlement && ledger) {
    if (settlement.netAmount === ledger.amount) {
      return formatCurrencyAmount(currency, settlement.netAmount);
    }
    return `${formatCurrencyAmount(currency, settlement.netAmount)} → ${formatCurrencyAmount(currency, ledger.amount)}`;
  }
  if (settlement) return formatCurrencyAmount(currency, settlement.netAmount);
  if (ledger) return formatCurrencyAmount(currency, ledger.amount);
  return '—';
}
