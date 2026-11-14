/**
 * SokoOS Desktop typed API client.
 *
 * Adapted from apps/web/src/lib/api-client.ts. Deliberate differences from the web client:
 *  - No browser storage: session material is read from an injected SessionProvider so the
 *    secure desktop store (Phase 3) can own tokens and business/branch context.
 *  - No `window.location` redirect on 401; it notifies a registered handler instead, because
 *    the desktop app has its own navigation model (not Next.js routes).
 *  - Same /v1 REST contract, same X-Business-Id / X-Branch-Id headers, same error envelope
 *    and the same shared error-code vocabulary from @sokoos/shared.
 */
import { ErrorCodes } from '@sokoos/shared';
import { API_BASE_URL, API_PREFIX } from '@/lib/config';

export interface SessionContext {
  accessToken: string | null;
  businessId: string | null;
  branchId: string | null;
}

export interface SessionProvider {
  getContext(): SessionContext;
}

const EMPTY_SESSION: SessionProvider = {
  getContext: () => ({ accessToken: null, businessId: null, branchId: null }),
};

let sessionProvider: SessionProvider = EMPTY_SESSION;
let onUnauthenticated: (() => void) | null = null;

/** Inject the storage-backed session provider (Phase 3 wires the secure store). */
export function setSessionProvider(provider: SessionProvider): void {
  sessionProvider = provider;
}

/** Register a handler invoked when the API returns 401. */
export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler;
}

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

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
    requestId?: string;
  };
}

/** Map an HTTP status to a shared error code when the server sends no envelope code. */
function fallbackCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return ErrorCodes.VALIDATION_ERROR;
    case 401:
      return ErrorCodes.UNAUTHENTICATED;
    case 403:
      return ErrorCodes.PERMISSION_DENIED;
    case 404:
      return ErrorCodes.RESOURCE_NOT_FOUND;
    case 409:
      return ErrorCodes.STALE_RESOURCE;
    case 429:
      return ErrorCodes.RATE_LIMITED;
    default:
      return status >= 500 ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.VALIDATION_ERROR;
  }
}

export function buildHeaders(): Record<string, string> {
  const { accessToken, businessId, branchId } = sessionProvider.getContext();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (businessId) headers['X-Business-Id'] = businessId;
  if (branchId) headers['X-Branch-Id'] = branchId;
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers: buildHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // Honest network failure — the server was unreachable, not an application error.
    throw new ApiError('NETWORK_ERROR', 'Unable to reach the SokoOS server', 0);
  }

  if (response.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('PARSE_ERROR', 'Failed to parse server response', response.status);
  }

  if (!response.ok) {
    const err = (data as ApiErrorEnvelope)?.error;

    if (response.status === 401 && onUnauthenticated) {
      onUnauthenticated();
    }

    throw new ApiError(
      err?.code ?? fallbackCodeForStatus(response.status),
      Object.values(err?.details ?? {})
        .flat()[0] ?? err?.message ?? 'An error occurred',
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
