import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, buildHeaders, setSessionProvider } from '@/lib/api-client';

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionProvider({
    getContext: () => ({ accessToken: null, businessId: null, branchId: null }),
  });
});

describe('desktop api client', () => {
  it('attaches auth and tenant headers from the injected session provider', () => {
    setSessionProvider({
      getContext: () => ({ accessToken: 'tok-123', businessId: 'biz-1', branchId: 'br-1' }),
    });

    const headers = buildHeaders();
    expect(headers.Authorization).toBe('Bearer tok-123');
    expect(headers['X-Business-Id']).toBe('biz-1');
    expect(headers['X-Branch-Id']).toBe('br-1');
  });

  it('omits tenant headers when no business/branch context is set', () => {
    const headers = buildHeaders();
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Business-Id']).toBeUndefined();
    expect(headers['X-Branch-Id']).toBeUndefined();
  });

  it('calls the versioned /v1 path', async () => {
    const fetchMock = stubFetch(200, { status: 'ok' });
    await api.get('/health');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/health$/),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('maps a server error envelope onto ApiError using the shared vocabulary', async () => {
    stubFetch(403, {
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Missing permission: sales.create',
        requestId: 'req-1',
      },
    });

    await expect(api.post('/sales', {})).rejects.toMatchObject({
      name: 'ApiError',
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
      requestId: 'req-1',
    });
  });

  it('falls back to a shared error code when the server sends no envelope', async () => {
    stubFetch(404, { message: 'nope' });

    await expect(api.get('/missing')).rejects.toBeInstanceOf(ApiError);
    await expect(api.get('/missing')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('reports an honest NETWORK_ERROR when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(api.get('/health')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      httpStatus: 0,
    });
  });
});
