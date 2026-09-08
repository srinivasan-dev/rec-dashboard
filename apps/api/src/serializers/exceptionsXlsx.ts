import ExcelJS from 'exceljs';

import type { ReconciliationException } from '@rapyd-portal/shared';

import { EXPORT_COLUMNS, toExportRow } from './exceptionsExportRows';

export async function toExceptionsXlsx(
  exceptions: ReconciliationException[],
  merchantId: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rapyd Settlement Reconciliation';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Exceptions');
  sheet.addRow([`Merchant ${merchantId} -- exceptions needing review`]);
  sheet.mergeCells(1, 1, 1, EXPORT_COLUMNS.length);
  sheet.getCell(1, 1).font = { bold: true };
  sheet.addRow([]);

  const headerRow = sheet.addRow([...EXPORT_COLUMNS]);
  headerRow.font = { bold: true };

  for (const exception of exceptions) {
    sheet.addRow(toExportRow(exception));
  }

  sheet.columns.forEach((column) => {
    column.width = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
