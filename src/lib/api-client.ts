/**
 * Axios client for the Django REST backend.
 *
 *  - Base URL: VITE_API_URL (e.g. https://api.example.com/api), defaults to
 *    http://localhost:8000/api for local development.
 *  - Authentication is Firebase: the bearer token comes from the token provider
 *    registered by src/lib/auth.tsx (a Firebase ID token, refreshed by the SDK),
 *    so this module knows nothing about how sessions are obtained.
 *  - A 401 invokes the registered unauthorized handler (which signs out) so the
 *    UI never keeps showing a workspace the API refuses to serve.
 */
import axios, { AxiosError } from "axios";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL as string | undefined
)?.replace(/\/+$/, "") || "http://localhost:8000/api";

/** Supplies the bearer token for every request (Firebase ID token). */
type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider = async () => null;

export function setAccessTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider ?? (async () => null);
}

/** Called once per 401 so the auth layer can drop the session. */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await tokenProvider();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* no token available — the request goes out anonymous and may 401 */
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

/** Human-friendly message from a Django/DRF error response. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { detail?: string | string[]; non_field_errors?: string[]; email?: string[]; password?: string[] }
      | undefined;
    if (data) {
      if (data.detail) return Array.isArray(data.detail) ? data.detail[0] : data.detail;
      if (data.non_field_errors?.length) return data.non_field_errors[0];
      if (data.email?.length) return data.email[0];
      if (data.password?.length) return data.password[0];
    }
    if (!err.response) return "Cannot reach the server. Is the API running?";
    if (err.response.status === 401) return "Your session expired. Please sign in again.";
    return `Request failed (${err.response.status}).`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

/** Throw helper used by the API modules. */
export async function toApiError(err: unknown): Promise<never> {
  throw new Error(apiErrorMessage(err));
}
