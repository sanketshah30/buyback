import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { get as blobGet, head as blobHead, put as blobPut } from '@vercel/blob';

/**
 * Upload storage for buyback media (documents, product/assessment images,
 * assessment videos, receipt PDFs).
 *
 * - When `BLOB_READ_WRITE_TOKEN` is set: private Vercel Blob (required on Vercel).
 * - Otherwise: local disk under uploads/ for local/dev fallback.
 *
 * Clients never see raw Blob URLs. Stored values on BuybackRequest are pathnames
 * like `buybacks/<id>/<kind>/<file>`, downloaded via GET /api/uploads/<pathname>
 * after auth + ownership checks.
 */

export type UploadKind = 'document' | 'product' | 'assessment' | 'video' | 'receipt';

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'] as const;

export const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.mp4',
  '.mov',
  '.webm',
  '.m4v',
  '.pdf',
]);

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.pdf': 'application/pdf',
};

export const uploadsRootDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'buyback-uploads')
  : path.resolve(__dirname, '../../uploads');

try {
  fs.mkdirSync(uploadsRootDir, { recursive: true });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`[blobStorage] Could not create uploads directory at ${uploadsRootDir}:`, err);
}

export function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function buildObjectPathname(buybackId: number | string, kind: UploadKind, filename: string): string {
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `buybacks/${buybackId}/${kind}/${safeName}`;
}

/** API path the SPA uses (with Authorization) to download a stored object. */
export function toDownloadApiPath(pathname: string): string {
  const cleaned = pathname.replace(/^\/+/, '').replace(/^api\/uploads\//, '');
  return `/api/uploads/${cleaned}`;
}

/** Normalize whatever we historically stored into a canonical object pathname. */
export function parseStoredPathname(stored: string): string {
  if (stored.startsWith('buybacks/')) return stored;
  const stripped = stored.replace(/^\/api\/uploads\//, '');
  if (stripped.startsWith('buybacks/')) return stripped;
  // Legacy: /api/uploads/<id>/<filename>
  const legacy = stored.match(/^\/api\/uploads\/(\d+)\/([^/]+)$/);
  if (legacy) return `buybacks/${legacy[1]}/document/${legacy[2]}`;
  return stripped;
}

export function buybackIdFromPathname(pathname: string): number | undefined {
  const match = pathname.match(/^buybacks\/(\d+)\//);
  return match ? Number(match[1]) : undefined;
}

export function isPathnameUnderBuyback(pathname: string, buybackId: number | string): boolean {
  return pathname.startsWith(`buybacks/${buybackId}/`);
}

export function isAllowedUploadFilename(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function assertObjectExists(pathname: string): Promise<void> {
  if (isBlobEnabled()) {
    await blobHead(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return;
  }
  const filePath = path.join(uploadsRootDir, pathname);
  if (!fs.existsSync(filePath)) {
    throw Object.assign(new Error(`Upload not found: ${pathname}`), { status: 400 });
  }
}

/**
 * Move a multer temp file into Blob (or local disk) under
 * `buybacks/<id>/<kind>/…` and return the stored pathname.
 */
export async function ingestMulterFile(
  buybackId: number | string,
  kind: UploadKind,
  file: Express.Multer.File,
): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || path.extname(file.filename) || '.bin';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const pathname = buildObjectPathname(buybackId, kind, filename);
  const buffer = fs.readFileSync(file.path);
  try {
    await putObject(pathname, buffer, file.mimetype || EXTENSION_CONTENT_TYPES[ext] || 'application/octet-stream');
  } finally {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // temp file may already be gone
    }
  }
  return pathname;
}

export async function putObject(
  pathname: string,
  body: Buffer | ReadableStream | Blob | ArrayBuffer | string,
  contentType: string,
): Promise<string> {
  if (isBlobEnabled()) {
    await blobPut(pathname, body, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType,
      addRandomSuffix: false,
    });
    return pathname;
  }

  const filePath = path.join(uploadsRootDir, pathname);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let buffer: Buffer;
  if (Buffer.isBuffer(body)) {
    buffer = body;
  } else if (typeof body === 'string') {
    buffer = Buffer.from(body);
  } else if (body instanceof ArrayBuffer) {
    buffer = Buffer.from(body);
  } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
    buffer = Buffer.from(await body.arrayBuffer());
  } else {
    // ReadableStream
    const res = new Response(body as ReadableStream);
    buffer = Buffer.from(await res.arrayBuffer());
  }
  fs.writeFileSync(filePath, buffer);
  return pathname;
}

export async function readObject(pathname: string): Promise<{
  nodeStream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
}> {
  const ext = path.extname(pathname).toLowerCase();
  const fallbackType = EXTENSION_CONTENT_TYPES[ext] ?? 'application/octet-stream';

  if (isBlobEnabled()) {
    const result = await blobGet(pathname, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw Object.assign(new Error('Not found'), { status: 404 });
    }
    return {
      nodeStream: Readable.fromWeb(result.stream as import('stream/web').ReadableStream),
      contentType: result.blob.contentType || fallbackType,
      contentLength: result.blob.size,
    };
  }

  const filePath = path.join(uploadsRootDir, pathname);
  if (!fs.existsSync(filePath)) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }
  return {
    nodeStream: fs.createReadStream(filePath),
    contentType: fallbackType,
    contentLength: fs.statSync(filePath).size,
  };
}

export async function readObjectBuffer(pathname: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (isBlobEnabled()) {
    const result = await blobGet(pathname, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw Object.assign(new Error('Not found'), { status: 404 });
    }
    const chunks: Uint8Array[] = [];
    const reader = result.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return {
      buffer: Buffer.concat(chunks.map((c) => Buffer.from(c))),
      contentType: result.blob.contentType || 'application/octet-stream',
    };
  }
  const filePath = path.join(uploadsRootDir, pathname);
  return {
    buffer: fs.readFileSync(filePath),
    contentType: EXTENSION_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  };
}
