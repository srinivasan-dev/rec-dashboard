import PDFDocument from 'pdfkit';

import type { ReconciliationException } from '@rapyd-portal/shared';

import { EXPORT_COLUMNS, toExportRow } from './exceptionsExportRows';

const PAGE_MARGIN = 36;
const COLUMN_WIDTH = 108;
const ROW_HEIGHT = 20;

function drawRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cells: readonly string[],
  bold: boolean,
): void {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
  cells.forEach((cell, index) => {
    doc.text(cell, PAGE_MARGIN + index * COLUMN_WIDTH, y, {
      width: COLUMN_WIDTH - 4,
      ellipsis: true,
    });
  });
}

/**
 * A plain tabular report, drawn by hand rather than via a table plugin -- pdfkit has no built-in
 * table support, and this dataset's export doesn't need more than fixed-width columns and simple
 * pagination. Kept in the same row shape as the CSV/Excel exports (exceptionsExportRows.ts) so
 * all three formats always agree on what "the current view" contains.
 */
export function toExceptionsPdf(
  exceptions: ReconciliationException[],
  merchantId: string,
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(`Merchant ${merchantId} -- exceptions needing review`);
  doc.fontSize(9).font('Helvetica').text(`Generated ${new Date().toISOString()}`);
  doc.moveDown();

  let y = doc.y;
  drawRow(doc, y, EXPORT_COLUMNS, true);
  y += ROW_HEIGHT;
  doc
    .moveTo(PAGE_MARGIN, y - 4)
    .lineTo(PAGE_MARGIN + EXPORT_COLUMNS.length * COLUMN_WIDTH, y - 4)
    .strokeColor('#cccccc')
    .stroke();

  for (const exception of exceptions) {
    if (y > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    drawRow(doc, y, toExportRow(exception), false);
    y += ROW_HEIGHT;
  }

  const finished = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  doc.end();
  return finished;
}
