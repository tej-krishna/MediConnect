import type { ApiResponse, PaginationMeta } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Held in memory only (never localStorage) per the Phase 2 security design: an access token that
// lives in JS-reachable storage is an XSS target. It's lost on a hard reload by design — refresh()
// below re-establishes it from the HttpOnly refresh cookie.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  isFormData?: boolean;
  skipAuthRetry?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (!options.isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !json || !json.success) {
    const message = json && !json.success ? json.error.message : `Request failed with status ${res.status}`;
    const code = json && !json.success ? json.error.code : 'UNKNOWN_ERROR';
    throw new ApiError(res.status, code, message);
  }

  return { data: json.data, meta: json.meta };
}

async function tryRefresh(): Promise<boolean> {
  try {
    const { data } = await rawRequest<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      skipAuthRetry: true,
    });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const isAuthFailure = error instanceof ApiError && error.status === 401;
    if (isAuthFailure && !options.skipAuthRetry) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawRequest<T>(path, options);
      }
    }
    throw error;
  }
}

async function rawDownload(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { method: 'GET', headers, credentials: 'include' });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as ApiResponse<never> | null;
    const message = json && !json.success ? json.error.message : `Request failed with status ${res.status}`;
    const code = json && !json.success ? json.error.code : 'UNKNOWN_ERROR';
    throw new ApiError(res.status, code, message);
  }

  const disposition = res.headers.get('Content-Disposition');
  const match = disposition ? /filename="?([^"]+)"?/.exec(disposition) : null;
  return { blob: await res.blob(), filename: match ? decodeURIComponent(match[1]) : null };
}

async function downloadFile(path: string): Promise<{ blob: Blob; filename: string | null }> {
  try {
    return await rawDownload(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawDownload(path);
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData, isFormData: true }),
  downloadFile,
};
