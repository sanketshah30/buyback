import { upload } from '@vercel/blob/client';
import { API_BASE_URL, ApiError, getToken, api } from './api';
import { compressImage } from './compressImage';

export type UploadKind = 'document' | 'product' | 'assessment' | 'video' | 'receipt';

export type UploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

type UploadMode = 'blob' | 'local';

let cachedMode: UploadMode | null = null;

export async function getUploadMode(): Promise<UploadMode> {
  if (cachedMode) return cachedMode;
  try {
    const res = await api.get<{ mode: UploadMode }>('/api/uploads/mode');
    cachedMode = res.mode === 'blob' ? 'blob' : 'local';
  } catch {
    cachedMode = 'local';
  }
  return cachedMode;
}

function randomName(originalName: string, forceJpeg?: boolean): string {
  const ext = forceJpeg ? '.jpg' : (originalName.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase() || '.bin';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

function requirePathname(pathname: string | undefined | null, label: string): string {
  const value = typeof pathname === 'string' ? pathname.trim() : '';
  if (!value) {
    throw new ApiError(`${label} upload finished without a storage pathname. Refresh the app and try again.`, 500);
  }
  return value;
}

/**
 * Uploads one file for a buyback (Blob client upload when configured, else
 * local multipart fallback). Photos are resized first. Returns the stored
 * object pathname (`buybacks/<id>/<kind>/<file>`).
 */
export async function uploadBuybackFile(
  buybackId: string | number,
  kind: UploadKind,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const prepared = kind === 'video' ? file : await compressImage(file);
  const filename = randomName(prepared.name, kind !== 'video');
  const pathname = `buybacks/${buybackId}/${kind}/${filename}`;
  const mode = await getUploadMode();

  if (mode === 'blob') {
    const token = getToken();
    if (!token) throw new ApiError('Not authenticated', 401);

    const result = await upload(pathname, prepared, {
      access: 'private',
      handleUploadUrl: `${API_BASE_URL}/api/uploads/token`,
      clientPayload: JSON.stringify({ buybackId: Number(buybackId), kind }),
      headers: { Authorization: `Bearer ${token}` },
      multipart: prepared.size > 4 * 1024 * 1024,
      contentType: prepared.type || undefined,
      onUploadProgress: onProgress
        ? (event) =>
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: event.percentage,
            })
        : undefined,
    });
    return requirePathname(result.pathname, kind);
  }

  // Local disk fallback (no BLOB_READ_WRITE_TOKEN)
  const form = new FormData();
  form.append('file', prepared, filename);
  form.append('buybackId', String(buybackId));
  form.append('kind', kind);
  onProgress?.({ loaded: 0, total: prepared.size, percentage: 0 });
  const res = await api.upload<{ pathname: string }>('/api/uploads/local', form);
  onProgress?.({ loaded: prepared.size, total: prepared.size, percentage: 100 });
  return requirePathname(res.pathname, kind);
}

export async function uploadBuybackFiles(
  buybackId: string | number,
  kind: UploadKind,
  files: File[],
  onFileProgress?: (index: number, label: string, progress: UploadProgress | { error: string }) => void,
): Promise<string[]> {
  const pathnames: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    try {
      const pathname = await uploadBuybackFile(buybackId, kind, file, (progress) =>
        onFileProgress?.(i, file.name, progress),
      );
      pathnames.push(pathname);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      onFileProgress?.(i, file.name, { error: message });
      throw err;
    }
  }
  return pathnames;
}
