// Empty string = relative requests, which go through the Vite dev/preview
// server proxy (see vite.config.ts) so the app always calls the API on the
// same origin the page was loaded from.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_STORAGE_KEY = 'buyback.token';

/**
 * Dispatched whenever an authenticated request comes back 401 - i.e. the
 * server has decided our session is no longer valid (logged out elsewhere,
 * expired, or revoked), as opposed to some other endpoint-specific 401.
 * `AuthProvider` (see lib/auth.tsx) listens for this to clear its state,
 * which in turn makes every `ProtectedRoute` redirect to `/login` - see
 * server/src/middleware/auth.middleware.ts for the server side of this.
 */
export const SESSION_EXPIRED_EVENT = 'buyback:session-expired';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Shared by request() and getBlob() below - attaches the auth header and reacts to a dead session the same way regardless of response shape. */
async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  // Only a request that actually carried a token can mean "session died" -
  // the OTP request/verify endpoints are unauthenticated and never return
  // 401 for their own reasons, so this only ever fires for a genuinely dead
  // session.
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await authedFetch(path, options);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    throw new ApiError(data?.error ?? res.statusText ?? 'Request failed', res.status);
  }
  return data as T;
}

/** For binary responses (e.g. the purchase-receipt PDF) that can't be rendered via a plain `<iframe src>` since that wouldn't carry the Authorization header - see pages/buyback/ReceiptPage.tsx. */
async function getBlob(path: string): Promise<Blob> {
  const res = await authedFetch(path, { method: 'GET' });
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const data = await res.json();
      message = data?.error ?? message;
    } catch {
      // Response wasn't JSON (e.g. a plain 404) - keep the status text.
    }
    throw new ApiError(message, res.status);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  upload: <T>(path: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST') =>
    request<T>(path, { method, body: formData }),
  getBlob,
};

export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}
