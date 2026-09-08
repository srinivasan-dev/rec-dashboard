import { parseCsv, parseLedgerCsv, parseSettlementCsv } from './parsing';

describe('parseCsv', () => {
  it('parses header + rows into keyed objects', () => {
    const rows = parseCsv('a,b\n1,2\n3,4');
    expect(rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('parseSettlementCsv / parseLedgerCsv', () => {
  it('parses settlement rows into SettlementRecord with amounts in minor units', () => {
    const csv =
      'settlement_id,transaction_id,merchant_id,transaction_date,settlement_date,currency,gross_amount,fee_amount,net_amount,status\n' +
      'S1,T1,M-104,2026-07-01,2026-07-02,AED,267.80,10.00,257.80,settled';

    const [record] = parseSettlementCsv(csv);
    expect(record).toEqual({
      settlementId: 'S1',
      transactionId: 'T1',
      merchantId: 'M-104',
      transactionDate: '2026-07-01',
      settlementDate: '2026-07-02',
      currency: 'AED',
      grossAmountMinorUnits: 26780,
      feeAmountMinorUnits: 1000,
      netAmountMinorUnits: 25780,
      status: 'settled',
    });
  });

  it('parses ledger rows into LedgerRecord with amounts in minor units', () => {
    const csv =
      'ledger_id,transaction_id,merchant_id,transaction_date,currency,amount,status\n' +
      'L1,T1,M-104,2026-07-01,AED,257.80,posted';

    const [record] = parseLedgerCsv(csv);
    expect(record).toEqual({
      ledgerId: 'L1',
      transactionId: 'T1',
      merchantId: 'M-104',
      transactionDate: '2026-07-01',
      currency: 'AED',
      amountMinorUnits: 25780,
      status: 'posted',
    });
  });
});
