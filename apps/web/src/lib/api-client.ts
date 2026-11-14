/**
 * SokoOS typed API client
 * - Attaches JWT from session storage
 * - Sends X-Business-Id and X-Branch-Id headers
 * - Handles error envelope: { error: { code, message, details, requestId } }
 * - Handles 401 → redirect to login
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, string[]>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const token = sessionStorage.getItem('sokoos_access_token') ?? localStorage.getItem('sokoos_access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const businessId = sessionStorage.getItem('sokoos_business_id');
    if (businessId) headers['X-Business-Id'] = businessId;

    const branchId = sessionStorage.getItem('sokoos_branch_id');
    if (branchId) headers['X-Branch-Id'] = branchId;
  } catch {
    // sessionStorage not available (SSR)
  }

  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}/v1${path}`, {
    method,
    headers: getAuthHeaders(),
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (response.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('PARSE_ERROR', 'Failed to parse response', response.status);
  }

  if (!response.ok) {
    const err = (data as { error?: { code: string; message: string; details?: Record<string, string[]>; requestId?: string } })?.error;

    if (response.status === 401) {
      try {
        sessionStorage.removeItem('sokoos_access_token');
        localStorage.removeItem('sokoos_access_token');
      } catch { /* noop */ }
      if (typeof window !== 'undefined') {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    throw new ApiError(
      err?.code ?? 'UNKNOWN_ERROR',
      Object.values(err?.details ?? {}).flat()[0] ?? err?.message ?? 'An error occurred',
      response.status,
      err?.details,
      err?.requestId,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ── Auth helpers ──────────────────────────────────────────────────────────────
export function saveSession(accessToken: string, refreshToken: string, rememberMe = false) {
  try {
    sessionStorage.setItem('sokoos_access_token', accessToken);
    sessionStorage.setItem('sokoos_refresh_token', refreshToken);
    if (rememberMe) {
      localStorage.setItem('sokoos_access_token', accessToken);
      localStorage.setItem('sokoos_refresh_token', refreshToken);
    }
  } catch { /* noop */ }
}

export function setActiveContext(businessId: string, branchId?: string) {
  try {
    sessionStorage.setItem('sokoos_business_id', businessId);
    if (branchId) sessionStorage.setItem('sokoos_branch_id', branchId);
  } catch { /* noop */ }
}

export function clearSession() {
  try {
    sessionStorage.clear();
    localStorage.removeItem('sokoos_access_token');
    localStorage.removeItem('sokoos_refresh_token');
  } catch { /* noop */ }
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem('sokoos_access_token') ?? localStorage.getItem('sokoos_access_token');
  } catch { return null; }
}
