import type { ExceptionDto } from '../api/types';

/** Inserts thousands separators into a decimal string without ever parsing it as a float. */
export function formatCurrencyAmount(currency: string, decimalAmount: string): string {
  const negative = decimalAmount.startsWith('-');
  const unsigned = negative ? decimalAmount.slice(1) : decimalAmount;
  const [whole, fraction] = unsigned.split('.');
  const withThousands = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${negative ? '-' : ''}${withThousands}${fraction ? `.${fraction}` : ''}`;
}

/** The date an exception is displayed under -- whichever side of the pair actually exists. */
export function exceptionDate(exception: ExceptionDto): string {
  return exception.settlement?.transactionDate ?? exception.ledger?.transactionDate ?? '';
}

/** A short "settlement vs. ledger" summary for the exceptions table's amount column. */
export function exceptionAmountSummary(exception: ExceptionDto): string {
  const { settlement, ledger, currency } = exception;

  if (settlement && ledger) {
    return `${formatCurrencyAmount(currency, settlement.netAmount)} → ${formatCurrencyAmount(currency, ledger.amount)}`;
  }
  if (settlement) return formatCurrencyAmount(currency, settlement.netAmount);
  if (ledger) return formatCurrencyAmount(currency, ledger.amount);
  return '—';
}
