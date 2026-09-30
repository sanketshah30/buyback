import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { buybackRepository } from '../repositories';
import {
  EXTENSION_CONTENT_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_MIME_TYPES,
  UploadKind,
  assertObjectExists,
  buildObjectPathname,
  buybackIdFromPathname,
  isAllowedUploadFilename,
  isBlobEnabled,
  isPathnameUnderBuyback,
  parseStoredPathname,
  readObject,
  uploadsRootDir,
} from '../services/blobStorage.service';
import { parseId } from '../utils/parseId';

export const uploadsRouter = Router();

const UPLOAD_KINDS = new Set<UploadKind>(['document', 'product', 'assessment', 'video', 'receipt']);

uploadsRouter.get('/mode', (_req, res) => {
  res.json({ mode: isBlobEnabled() ? 'blob' : 'local' });
});

/**
 * Client-upload token exchange for `@vercel/blob/client` `upload()`.
 * Auth + ownership are enforced in `onBeforeGenerateToken`. We intentionally
 * omit `onUploadCompleted` (unreliable on localhost); the SPA sends pathnames
 * to buyback endpoints which verify via `head()` / disk exists.
 */
uploadsRouter.post('/token', requireAuth, async (req: AuthedRequest, res) => {
  if (!isBlobEnabled()) {
    return res.status(503).json({ error: 'Blob uploads are not configured', mode: 'local' });
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      request: req,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload: { buybackId?: number | string; kind?: string } = {};
        try {
          payload = clientPayload ? (JSON.parse(clientPayload) as typeof payload) : {};
        } catch {
          throw new Error('Invalid clientPayload');
        }

        const buybackId = parseId(String(payload.buybackId ?? ''));
        const kind = payload.kind as UploadKind | undefined;
        if (buybackId === undefined || !kind || !UPLOAD_KINDS.has(kind)) {
          throw new Error('buybackId and kind are required');
        }

        const request = await buybackRepository.findById(buybackId);
        if (!request || request.userId !== req.auth!.userId) {
          throw new Error('Buyback request not found');
        }

        if (!isPathnameUnderBuyback(pathname, buybackId) || !pathname.includes(`/${kind}/`)) {
          throw new Error('Invalid upload pathname');
        }
        if (!isAllowedUploadFilename(pathname)) {
          throw new Error('File type not allowed');
        }

        const isVideo = kind === 'video';
        return {
          allowedContentTypes: isVideo ? [...VIDEO_MIME_TYPES, 'video/*'] : [...IMAGE_MIME_TYPES, 'image/*'],
          maximumSizeInBytes: isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ buybackId, kind, userId: req.auth!.userId }),
        };
      },
    });

    return res.json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload token failed' });
  }
});

/**
 * Local-disk fallback when Blob is not configured: accept one file, store it
 * under `buybacks/<id>/<kind>/`, return the pathname the SPA should register.
 */
uploadsRouter.post('/local', requireAuth, upload.single('file'), async (req: AuthedRequest, res, next) => {
  try {
    if (isBlobEnabled()) {
      return res.status(400).json({ error: 'Use Blob client uploads when BLOB_READ_WRITE_TOKEN is set' });
    }
    if (!req.file) return res.status(400).json({ error: 'A file is required' });

    const buybackId = parseId(String(req.body.buybackId ?? ''));
    const kind = req.body.kind as UploadKind | undefined;
    if (buybackId === undefined || !kind || !UPLOAD_KINDS.has(kind)) {
      return res.status(400).json({ error: 'buybackId and kind are required' });
    }

    const request = await buybackRepository.findById(buybackId);
    if (!request || request.userId !== req.auth!.userId) {
      return res.status(404).json({ error: 'Buyback request not found' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || path.extname(req.file.filename);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const pathname = buildObjectPathname(buybackId, kind, filename);
    const dest = path.join(uploadsRootDir, pathname);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(req.file.path, dest);

    return res.json({ pathname });
  } catch (err) {
    return next(err);
  }
});

/** Authenticated download for `buybacks/<id>/<kind>/<file>` pathnames. */
uploadsRouter.get('/buybacks/:buybackId/:kind/:filename', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const buybackId = parseId(req.params.buybackId);
    const kind = path.basename(req.params.kind);
    const filename = path.basename(req.params.filename);
    if (buybackId === undefined || !UPLOAD_KINDS.has(kind as UploadKind)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const request = await buybackRepository.findById(buybackId);
    if (!request || request.userId !== req.auth!.userId) {
      return res.status(404).json({ error: 'Not found' });
    }

    const pathname = buildObjectPathname(buybackId, kind as UploadKind, filename);
    await assertObjectExists(pathname);

    const { nodeStream, contentType, contentLength } = await readObject(pathname);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (contentLength !== undefined) res.setHeader('Content-Length', String(contentLength));
    nodeStream.pipe(res);
    return undefined;
  } catch (err) {
    return next(err);
  }
});

/** Legacy flat download path: `/api/uploads/:buybackId/:filename`. */
uploadsRouter.get('/:buybackId/:filename', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const buybackId = parseId(req.params.buybackId);
    const request = buybackId !== undefined ? await buybackRepository.findById(buybackId) : undefined;
    if (!request || request.userId !== req.auth!.userId) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filename = path.basename(req.params.filename);
    const candidates = [
      `buybacks/${buybackId}/document/${filename}`,
      `buybacks/${buybackId}/product/${filename}`,
      `buybacks/${buybackId}/assessment/${filename}`,
      `buybacks/${buybackId}/video/${filename}`,
      `buybacks/${buybackId}/receipt/${filename}`,
    ];

    for (const candidate of candidates) {
      try {
        await assertObjectExists(candidate);
        const { nodeStream, contentType, contentLength } = await readObject(candidate);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'private, max-age=0, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (contentLength !== undefined) res.setHeader('Content-Length', String(contentLength));
        nodeStream.pipe(res);
        return undefined;
      } catch {
        // try next
      }
    }

    // Pre-Blob flat disk layout: uploads/<id>/<filename>
    const legacyPath = path.resolve(uploadsRootDir, String(buybackId), filename);
    const buybackDir = path.resolve(uploadsRootDir, String(buybackId));
    if (legacyPath.startsWith(buybackDir + path.sep) && fs.existsSync(legacyPath)) {
      const ext = path.extname(legacyPath).toLowerCase();
      res.setHeader('Content-Type', EXTENSION_CONTENT_TYPES[ext] ?? 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=0, no-store');
      return res.sendFile(legacyPath);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return next(err);
  }
});

export async function verifyBuybackPathnames(
  buybackId: number,
  userId: number,
  pathnames: string[],
): Promise<string[]> {
  const request = await buybackRepository.findById(buybackId);
  if (!request || request.userId !== userId) {
    throw Object.assign(new Error('Buyback request not found'), { status: 404 });
  }
  const normalized: string[] = [];
  for (const raw of pathnames) {
    const pathname = parseStoredPathname(raw);
    if (!isPathnameUnderBuyback(pathname, buybackId) || buybackIdFromPathname(pathname) !== buybackId) {
      throw Object.assign(new Error(`Invalid upload pathname: ${raw}`), { status: 400 });
    }
    await assertObjectExists(pathname);
    normalized.push(pathname);
  }
  return normalized;
}
