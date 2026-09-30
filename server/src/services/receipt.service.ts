import path from 'path';
import PDFDocument from 'pdfkit';
import { BuybackRequest, PartnerLocation } from '../types/domain';
import { buildObjectPathname, putObject } from './blobStorage.service';

const RECEIPT_FILENAME = 'receipt.pdf';

// Bundled Noto Sans (SIL OFL) - referenced via path.join(__dirname, ...) so
// Vercel's NFT file tracing includes the TTFs. Passing the regular face as
// PDFDocument's `font` also stops pdfkit from lazy-loading Helvetica.cjs
// (which Vercel does not bundle, and which cannot render ₹).
const FONT_REGULAR = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.join(__dirname, '../../assets/fonts/NotoSans-Bold.ttf');

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const PAGE_WIDTH = 420;
const PAGE_MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function row(doc: PDFKit.PDFDocument, label: string, value: string) {
  const labelWidth = 140;
  const y = doc.y;
  doc.font('Bold').fontSize(10).text(label, PAGE_MARGIN, y, { width: labelWidth });
  doc.font('Regular').fontSize(10).text(value || '-', PAGE_MARGIN + labelWidth, y, {
    width: CONTENT_WIDTH - labelWidth,
  });
  doc.moveDown(0.6);
}

/**
 * Generates the legal purchase-receipt PDF for a completed buyback in memory,
 * then stores it via private Vercel Blob (or local disk fallback) at
 * `buybacks/<id>/receipt/receipt.pdf`.
 */
export async function generatePurchaseReceipt(
  request: BuybackRequest,
  partnerLocation: PartnerLocation,
): Promise<{ pathname: string }> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: [PAGE_WIDTH, 700], margin: PAGE_MARGIN, font: FONT_REGULAR });
  doc.registerFont('Regular', FONT_REGULAR);
  doc.registerFont('Bold', FONT_BOLD);

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const reference = request.referenceId ?? `#${request.id}`;

  doc.font('Bold').fontSize(18).text('Device Purchase Receipt', { align: 'center' });
  doc.font('Regular').fontSize(10).fillColor('#555555').text('Legal proof of device purchase via buyback trade-in', {
    align: 'center',
  });
  doc.fillColor('#000000');
  doc.moveDown(1.5);

  doc.font('Bold').fontSize(12).text('Transaction');
  doc.moveDown(0.4);
  row(doc, 'Receipt / Reference No.', reference);
  row(doc, 'Date', formatDate(request.completedAt ?? new Date().toISOString()));
  row(doc, 'Purchasing Location', partnerLocation.name);
  row(
    doc,
    'Location Address',
    [partnerLocation.address, partnerLocation.city, partnerLocation.state, partnerLocation.zipCode, partnerLocation.country]
      .filter(Boolean)
      .join(', '),
  );
  doc.moveDown(1);

  doc.font('Bold').fontSize(12).text('Customer');
  doc.moveDown(0.4);
  row(doc, 'Name', request.customer?.name ?? '-');
  row(doc, 'Mobile', request.customer?.mobile ?? '-');
  row(doc, 'Email', request.customer?.email ?? '-');
  doc.moveDown(1);

  doc.font('Bold').fontSize(12).text('Device');
  doc.moveDown(0.4);
  row(doc, 'Category / Brand', [request.category?.name, request.brand?.name].filter(Boolean).join(' / '));
  row(doc, 'Product', request.product?.name ?? '-');
  row(doc, 'SKU', request.sku?.label ?? '-');
  row(doc, request.identifier?.type === 'serial' ? 'Serial Number' : 'IMEI', request.identifier?.value ?? '-');
  doc.moveDown(1);

  doc.font('Bold').fontSize(12).text('Buyback Value');
  doc.moveDown(0.4);
  const amount = request.finalValue ?? request.customerValue ?? request.maxValue;
  row(doc, 'Amount Paid to Customer', amount !== undefined ? `\u20b9${amount}` : '-');
  doc.moveDown(1.5);

  doc.font('Regular').fontSize(9).fillColor('#555555').text(
    'This receipt certifies that the above device was purchased from the named customer by the named ' +
      'purchasing location, at the buyback value stated above, as part of a device trade-in transaction.',
    { align: 'left' },
  );

  doc.end();
  const pdfBuffer = await done;

  const pathname = buildObjectPathname(request.id, 'receipt', RECEIPT_FILENAME);
  await putObject(pathname, pdfBuffer, 'application/pdf');
  return { pathname };
}
