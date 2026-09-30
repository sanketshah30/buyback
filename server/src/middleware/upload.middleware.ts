import fs from 'fs';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import {
  ALLOWED_EXTENSIONS,
  VIDEO_MAX_BYTES,
  uploadsRootDir,
} from '../services/blobStorage.service';

/**
 * Multer adapter for:
 * - Local-disk fallback (`POST /api/uploads/local`) when Blob is unset
 * - Legacy multipart on buyback routes (stale PWA clients) which then `putObject` to Blob
 *
 * Prefer client Blob uploads via `POST /api/uploads/token` in production.
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

/** Run multer only when the request is actually multipart (JSON pathname clients skip it). */
export function optionalSingle(field: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
      return upload.single(field)(req, res, next);
    }
    return next();
  };
}

export function optionalArray(field: string, maxCount: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
      return upload.array(field, maxCount)(req, res, next);
    }
    return next();
  };
}
