/**
 * Axios client for the Django REST backend.
 *
 *  - Base URL resolution, in order:
 *      1. VITE_API_URL when set (e.g. https://example.com/api), trailing
 *         slashes stripped.
 *      2. "/api" in a production build — the SPA and the API are served from
 *         the same origin (nginx serves the static build and proxies /api/*
 *         to gunicorn), so a relative base is correct on every domain and
 *         needs no rebuild when the host changes.
 *      3. http://localhost:8000/api for local development only, so a dev
 *         machine never needs a .env file to talk to the local Django server.
 *    Production builds therefore never contain a localhost URL.
 *  - Authentication is Firebase: the bearer token comes from the token provider
 *    registered by src/lib/auth.tsx (a Firebase ID token, refreshed by the SDK),
 *    so this module knows nothing about how sessions are obtained.
 *  - A 401 invokes the registered unauthorized handler (which signs out) so the
 *    UI never keeps showing a workspace the API refuses to serve.
 */
import axios, { AxiosError } from "axios";

const configuredBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "");

export const API_BASE_URL =
  configuredBaseUrl || "/api";

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

/**
 * Human-friendly message from a Django/DRF error response.
 *
 * DRF shapes errors in several ways (`detail`, `non_field_errors`, or per-field
 * lists), so this walks the payload and returns the first usable sentence
 * before falling back to the HTTP status.
 */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | string | undefined;
    if (typeof data === "string" && data.trim()) return data.trim().slice(0, 300);
    if (data && typeof data === "object") {
      const firstString = (value: unknown): string | null => {
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
          for (const item of value) {
            const found = firstString(item);
            if (found) return found;
          }
        }
        return null;
      };
      // Preferred keys first, then whatever field the serializer complained about.
      for (const key of ["detail", "non_field_errors", "error", "message"]) {
        const found = firstString((data as Record<string, unknown>)[key]);
        if (found) return found;
      }
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const found = firstString(value);
        if (found) return key === "0" || key === "1" ? found : `${key}: ${found}`;
      }
    }
    if (!err.response) {
      return "Cannot reach the server. Check your connection and try again.";
    }
    const status = err.response.status;
    if (status === 401) return "Your session expired. Please sign in again.";
    if (status === 403) return "You do not have permission to do that.";
    if (status === 404) return "That record no longer exists.";
    if (status === 413) return "That file is too large to upload.";
    if (status >= 500) return `The server hit an error (${status}). Please try again shortly.`;
    return `Request failed (${status}).`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

/** Throw helper used by the API modules. */
export async function toApiError(err: unknown): Promise<never> {
  throw new Error(apiErrorMessage(err));
}
