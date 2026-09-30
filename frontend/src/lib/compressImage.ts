/**
 * Shrinks camera photos before upload (max long side 2000px, JPEG ~0.8).
 * Falls back to the original file if the browser can't decode it (e.g. some HEIC).
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? 2000;
  const quality = options.quality ?? 0.8;

  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file)));
}
