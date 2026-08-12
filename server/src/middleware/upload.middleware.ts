import fs from 'fs';
import multer from 'multer';
import path from 'path';

const uploadsDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// MVP mock storage: files land on local disk. Swap `storage` for an S3/GCS
// multer adapter when moving to production and this middleware's usage
// elsewhere in the codebase stays unchanged.
export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function toPublicUrl(filename: string): string {
  return `/uploads/${filename}`;
}
