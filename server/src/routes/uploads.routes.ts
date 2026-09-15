import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { uploadsRootDir } from '../middleware/upload.middleware';
import { buybackRepository } from '../repositories';
import { parseId } from '../utils/parseId';

export const uploadsRouter = Router();

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
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
};

// Uploaded ID documents and device photos are sensitive (PII) and must never
// be served as public static content - this route requires the same
// Bearer-token auth as the rest of the API, plus ownership of the specific
// buyback the file belongs to, before streaming a single file back.
uploadsRouter.get('/:buybackId/:filename', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const buybackId = parseId(req.params.buybackId);
    const request = buybackId !== undefined ? await buybackRepository.findById(buybackId) : undefined;
    if (!request || request.userId !== req.auth!.userId) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Sanitize both path segments and confirm the resolved path stays inside
    // this buyback's own upload folder, even though Express already decodes
    // path separators in route params - defense in depth against traversal.
    const buybackDir = path.resolve(uploadsRootDir, path.basename(req.params.buybackId));
    const filePath = path.resolve(buybackDir, path.basename(req.params.filename));
    if (!filePath.startsWith(buybackDir + path.sep) && filePath !== buybackDir) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = EXTENSION_CONTENT_TYPES[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.sendFile(filePath);
  } catch (err) {
    return next(err);
  }
});
