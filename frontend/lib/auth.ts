// ─────────────────────────────────────────────────────────────────────────────
// lib/auth.ts — Derma Copilot Frontend
// Gestión del token JWT en localStorage.
// Todas las funciones comprueban typeof window para ser SSR-safe.
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY  = 'derma_access_token';
const REFRESH_TOKEN_KEY = 'derma_refresh_token';

// ── Lectura ───────────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// ── Escritura / borrado ───────────────────────────────────────────────────────

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Validación ────────────────────────────────────────────────────────────────

/**
 * Decodifica el payload del JWT (sin verificar firma — eso lo hace el backend).
 * Devuelve null si el token está ausente, malformado o expirado.
 */
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    // atob necesita padding correcto
    const padded  = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const json    = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Retorna true si el accessToken existe y su claim `exp` está en el futuro.
 * Se usa para decidir si intentar restaurar la sesión al cargar la app.
 */
export function isTokenValid(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload || typeof payload['exp'] !== 'number') return false;

  // exp es epoch-seconds; Date.now() es epoch-ms
  return payload['exp'] * 1000 > Date.now();
}
