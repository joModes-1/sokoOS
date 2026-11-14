import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  try {
    const token = await AsyncStorage.getItem('sokoos_access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const businessId = await AsyncStorage.getItem('sokoos_business_id');
    if (businessId) headers['X-Business-Id'] = businessId;
    const branchId = await AsyncStorage.getItem('sokoos_branch_id');
    if (branchId) headers['X-Branch-Id'] = branchId;
  } catch {}
  return headers;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await getHeaders();
  const response = await fetch(`${API_URL}/v1${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return undefined as T;
  let data: unknown;
  try { data = await response.json(); } catch {
    throw new ApiError('PARSE_ERROR', 'Failed to parse response', response.status);
  }
  if (!response.ok) {
    const err = (data as { error?: { code: string; message: string; details?: Record<string, string[]> } })?.error;
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['sokoos_access_token', 'sokoos_refresh_token']);
    }
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? 'Request failed', response.status, err?.details);
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

export async function saveSession(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    ['sokoos_access_token', accessToken],
    ['sokoos_refresh_token', refreshToken],
  ]);
}

export async function setContext(businessId: string, branchId: string, industryCode: string, businessName: string, userName: string) {
  await AsyncStorage.multiSet([
    ['sokoos_business_id', businessId],
    ['sokoos_branch_id', branchId],
    ['sokoos_industry', industryCode],
    ['sokoos_business_name', businessName],
    ['sokoos_user_name', userName],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([
    'sokoos_access_token', 'sokoos_refresh_token',
    'sokoos_business_id', 'sokoos_branch_id',
    'sokoos_industry', 'sokoos_business_name', 'sokoos_user_name',
  ]);
}

export async function getSession() {
  const keys = ['sokoos_access_token', 'sokoos_business_id', 'sokoos_branch_id', 'sokoos_industry', 'sokoos_business_name', 'sokoos_user_name'];
  const pairs = await AsyncStorage.multiGet(keys);
  return Object.fromEntries(pairs.map(([k, v]) => [k.replace('sokoos_', ''), v ?? '']));
}
