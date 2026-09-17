import fs from 'fs';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';

export const uploadsRootDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsRootDir, { recursive: true });

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
// Defense in depth alongside the MIME check - some browsers/clients report a
// generic mimetype, so also gate on a known-safe extension allowlist to keep
// out anything that could be served/executed as active content (html, svg,
// js, etc.) if a client-declared mimetype were spoofed.
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif',
  '.mp4', '.mov', '.webm', '.m4v',
]);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
  const isAllowedExtension = ALLOWED_EXTENSIONS.has(path.extname(file.originalname).toLowerCase());
  if (!isAllowedMime || !isAllowedExtension) {
    cb(Object.assign(new Error('Only image or video files are allowed'), { status: 400 }));
    return;
  }
  cb(null, true);
};

// Files are stored per-buyback (uploads/<buybackId>/<file>) so the
// authenticated download route (see routes/uploads.routes.ts) can scope
// access to only the buybacks a user owns, instead of serving the whole
// uploads/ directory as public static content.
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const buybackId = req.params.id;
    if (!buybackId) {
      cb(new Error('Missing buyback id'), '');
      return;
    }
    const dir = path.join(uploadsRootDir, buybackId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// MVP mock storage: files land on local disk. Swap `storage` for an S3/GCS
// multer adapter when moving to production and this middleware's usage
// elsewhere in the codebase stays unchanged.
export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter,
});

export function toPublicUrl(buybackId: number, filename: string): string {
  return `/api/uploads/${buybackId}/${filename}`;
}
