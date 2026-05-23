// ─────────────────────────────────────────────────────────────────────────────
// lib/api.ts — Derma Copilot Frontend
//
// Cliente HTTP centralizado.
// · Adjunta el Bearer token automáticamente a las peticiones autenticadas.
// · Lanza ApiError con el código HTTP y el mensaje del backend.
// · En producción usa NEXT_PUBLIC_API_URL; en dev usa el proxy de next.config.ts
//   (rewrites /api/* → http://localhost:3001/api/*) para evitar CORS.
// ─────────────────────────────────────────────────────────────────────────────

import { clearTokens, getAccessToken } from './auth';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth';

// En dev la URL relativa usa el proxy de next.config.ts
// En prod apunta al backend desplegado vía env var
const BASE_URL =
  typeof window !== 'undefined'
    ? ''                                                      // usa el proxy del mismo origen
    : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001');

// ── ApiError ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Función base ──────────────────────────────────────────────────────────────

interface RequestOptions {
  method?:   string;
  body?:     unknown;
  skipAuth?: boolean;        // true en login/register — no hay token todavía
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!opts.skipAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method:  opts.method ?? 'GET',
    headers,
    body:    opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // Sesión expirada — limpiar tokens y redirigir al login
  if (res.status === 401 && !opts.skipAuth) {
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Sesión expirada. Inicia sesión nuevamente.');
  }

  // Intentar parsear JSON incluso en errores para obtener el mensaje del backend
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    // Acepta tanto `error` (formato actual backend) como `message` (fallback)
    const message =
      typeof data['error']   === 'string' ? data['error']   :
      typeof data['message'] === 'string' ? data['message'] :
      res.statusText;
    const fields = Array.isArray(data['fields'])
      ? (data['fields'] as Array<{ field: string; message: string }>)
      : undefined;
    throw new ApiError(res.status, message, fields);
  }

  return data as T;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  login: (credentials: LoginCredentials) =>
    request<AuthResponse>('/api/auth/login', {
      method:   'POST',
      body:     credentials,
      skipAuth: true,
    }),

  register: (data: RegisterData) =>
    request<AuthResponse>('/api/auth/register', {
      method:   'POST',
      body:     data,
      skipAuth: true,
    }),

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  refresh: (refreshToken: string) =>
    request<{ message: string; accessToken: string; refreshToken: string }>(
      '/api/auth/refresh',
      { method: 'POST', body: { refreshToken }, skipAuth: true },
    ),
};
