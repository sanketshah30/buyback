import fs from 'fs';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import {
  ALLOWED_EXTENSIONS,
  VIDEO_MAX_BYTES,
  uploadsRootDir,
} from '../services/blobStorage.service';

/**
 * Local-disk multer adapter used only when `BLOB_READ_WRITE_TOKEN` is unset
 * (local/dev fallback). Production on Vercel should use private Blob client
 * uploads via POST /api/uploads/token - see routes/uploads.routes.ts.
 */

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
  const isAllowedExtension = ALLOWED_EXTENSIONS.has(path.extname(file.originalname).toLowerCase());
  if (!isAllowedMime || !isAllowedExtension) {
    cb(Object.assign(new Error('Only image or video files are allowed'), { status: 400 }));
    return;
  }
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadsRootDir, '_tmp');
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      cb(err instanceof Error ? err : new Error('Could not create upload directory'), '');
      return;
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: VIDEO_MAX_BYTES },
  fileFilter,
});
