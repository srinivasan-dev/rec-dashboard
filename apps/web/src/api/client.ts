export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

/** Thin typed fetch wrapper -- the only thing in apps/web that knows the API's error shape. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // 'include' rather than the default 'same-origin' -- the API's session cookie (EPIC-15) must
  // be sent even if this app is ever deployed on a different origin than the API (see the
  // WEB_ORIGIN + credentialed-CORS setup in apps/api/src/app.ts). A no-op under the Vite dev
  // proxy, where everything is already same-origin from the browser's perspective.
  const res = await fetch(path, { credentials: 'include', ...init });

  if (!res.ok) {
    let message = 'Request failed.';
    try {
      const body = (await res.json()) as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Response body wasn't JSON (e.g. a network-level failure page) -- keep the generic message.
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}
