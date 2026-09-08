import { formatMinorUnitsAsDecimal, type ReconciliationException } from '@rapyd-portal/shared';

/** Column order/labels shared by every export format (CSV, Excel, PDF) -- one place to change it. */
export const EXPORT_COLUMNS = [
  'Transaction ID',
  'Reason',
  'Currency',
  'Settlement net amount',
  'Ledger amount',
  'Difference amount',
  'Transaction date',
] as const;

export function toExportRow(exception: ReconciliationException): string[] {
  return [
    exception.transactionId,
    exception.reason,
    exception.currency,
    exception.settlement ? formatMinorUnitsAsDecimal(exception.settlement.netAmountMinorUnits) : '',
    exception.ledger ? formatMinorUnitsAsDecimal(exception.ledger.amountMinorUnits) : '',
    exception.differenceMinorUnits === null
      ? ''
      : formatMinorUnitsAsDecimal(exception.differenceMinorUnits),
    exception.settlement?.transactionDate ?? exception.ledger?.transactionDate ?? '',
  ];
}
