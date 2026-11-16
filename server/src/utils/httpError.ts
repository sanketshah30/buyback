/** Attach an HTTP status so error.middleware can map it onto the response. */
export function httpError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

/** Require a positive integer `id` from a JSON body (never from the URL). */
export function requireBodyId(body: unknown): number {
  const raw = body && typeof body === 'object' ? (body as { id?: unknown }).id : undefined;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n > 0) return n;
  }
  throw httpError('id is required in the request body', 400);
}
