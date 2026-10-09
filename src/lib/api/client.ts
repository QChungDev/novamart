/**
 * Centralized API client for NovaMart backend (FastAPI).
 *
 * - Base URL from NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:8000)
 * - JWT access token in Authorization header, auto-refresh on 401
 * - Throws ApiError with backend error code/message
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export function isApiConfigured(): boolean {
  return API_BASE.length > 0;
}

export function apiBaseUrl(): string {
  return API_BASE;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super(
      "Backend chưa được cấu hình. Hãy đặt biến môi trường NEXT_PUBLIC_API_BASE_URL " +
        "trỏ tới FastAPI backend (ví dụ: http://localhost:8000).",
    );
  }
}

/* ------------------------------- Token storage ------------------------------ */

const ACCESS_KEY = "novamart-access-token";
const REFRESH_KEY = "novamart-refresh-token";

export const tokenStore = {
  getAccess(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/* --------------------------------- Fetch core ------------------------------- */

interface RequestOptions extends RequestInit {
  auth?: boolean; // attach access token (default true when token exists)
  retry?: boolean; // internal: allow one refresh retry
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh || !isApiConfigured()) return null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return null;
    }
    const data = await res.json();
    tokenStore.set(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) throw new ApiNotConfiguredError();

  const { auth = true, retry = true, headers, ...init } = options;
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) || {}),
  };

  if (auth) {
    const token = tokenStore.getAccess();
    if (token) reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: reqHeaders });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...options, retry: false });
    }
    // Refresh failed — force logout state.
    tokenStore.clear();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("novamart:unauthorized"));
    }
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } })?.error;
    throw new ApiError(
      res.status,
      err?.code || "request_failed",
      err?.message || `Yêu cầu thất bại (${res.status}).`,
    );
  }
  return data as T;
}

/* --------------------------------- Shortcuts -------------------------------- */

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
