import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { toPublicUrl, uploadsRootDir } from '../middleware/upload.middleware';
import { BuybackRequest, PartnerLocation } from '../types/domain';

const RECEIPT_FILENAME = 'receipt.pdf';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function row(doc: PDFKit.PDFDocument, label: string, value: string) {
  const labelWidth = 170;
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).text(label, 50, y, { width: labelWidth });
  doc.font('Helvetica').fontSize(10).text(value || '-', 50 + labelWidth, y, { width: 340 });
  doc.moveDown(0.6);
}

/**
 * Generates the legal purchase-receipt PDF for a completed buyback - proof
 * that `partnerLocation` bought the device from the customer - and writes
 * it to the same per-buyback uploads folder as document/product images
 * (`uploads/<buybackId>/receipt.pdf`), so it's served by the existing
 * `GET /api/uploads/:buybackId/:filename` route with no changes there
 * beyond the `.pdf` content-type mapping.
 *
 * Requires `request.customer`, `request.product`/`sku`/`identifier`, and
 * `request.finalValue` to already be set - i.e. it must be called only
 * once the buyback has actually reached "Completed" (see
 * routes/buyback.routes.ts's `/:id/confirm`).
 */
export async function generatePurchaseReceipt(request: BuybackRequest, partnerLocation: PartnerLocation): Promise<{ filePath: string; publicUrl: string }> {
  const dir = path.join(uploadsRootDir, String(request.id));
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, RECEIPT_FILENAME);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const reference = request.referenceId ?? `#${request.id}`;

  doc.font('Helvetica-Bold').fontSize(18).text('Device Purchase Receipt', { align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor('#555555').text('Legal proof of device purchase via buyback trade-in', { align: 'center' });
  doc.fillColor('#000000');
  doc.moveDown(1.5);

  doc.font('Helvetica-Bold').fontSize(12).text('Transaction');
  doc.moveDown(0.4);
  row(doc, 'Receipt / Reference No.', reference);
  row(doc, 'Date', formatDate(request.completedAt ?? new Date().toISOString()));
  row(doc, 'Purchasing Location', partnerLocation.name);
  row(doc, 'Location Address', [partnerLocation.address, partnerLocation.city, partnerLocation.state, partnerLocation.zipCode, partnerLocation.country].filter(Boolean).join(', '));
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).text('Customer');
  doc.moveDown(0.4);
  row(doc, 'Name', request.customer?.name ?? '-');
  row(doc, 'Mobile', request.customer?.mobile ?? '-');
  row(doc, 'Email', request.customer?.email ?? '-');
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).text('Device');
  doc.moveDown(0.4);
  row(doc, 'Category / Brand', [request.category?.name, request.brand?.name].filter(Boolean).join(' / '));
  row(doc, 'Product', request.product?.name ?? '-');
  row(doc, 'SKU', request.sku?.label ?? '-');
  row(doc, request.identifier?.type === 'serial' ? 'Serial Number' : 'IMEI', request.identifier?.value ?? '-');
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).text('Buyback Value');
  doc.moveDown(0.4);
  const amount = request.finalValue ?? request.customerValue ?? request.maxValue;
  row(doc, 'Amount Paid to Customer', amount !== undefined ? `\u20b9${amount}` : '-');
  doc.moveDown(1.5);

  doc.font('Helvetica').fontSize(9).fillColor('#555555').text(
    'This receipt certifies that the above device was purchased from the named customer by the named ' +
      'purchasing location, at the buyback value stated above, as part of a device trade-in transaction.',
    { align: 'left' },
  );

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return { filePath, publicUrl: toPublicUrl(request.id, RECEIPT_FILENAME) };
}
