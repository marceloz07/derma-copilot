// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/auth.controller.ts — Derma Copilot
//
// Responsabilidades de este módulo:
//   · Traducir requests HTTP en llamadas a authService
//   · Mapear AuthError (dominio) → código HTTP + mensaje JSON
//   · Firmar y verificar tokens JWT
//   · Registrar eventos de auditoría
//
// NO conoce bcrypt, Prisma ni la estructura interna de la BD.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import {
  AuthError,
  type AuthErrorCode,
  type SafeDermatologo,
  createUser,
  findUserById,
  validateCredentials,
} from '../services/authService';

// ─────────────────────────────────────────────────────────────────────────────
// HTTP error mapping
// ─────────────────────────────────────────────────────────────────────────────

/** Mapa exhaustivo de código de dominio → HTTP status code. */
const AUTH_HTTP_STATUS: Record<AuthErrorCode, number> = {
  EMAIL_TAKEN:         409,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND:      404,
};

/**
 * Si err es AuthError, escribe la respuesta HTTP correspondiente y retorna true.
 * Si no lo es, retorna false (el caller debe re-lanzar para express-async-errors).
 */
function handleAuthError(res: Response, err: unknown): boolean {
  if (!(err instanceof AuthError)) return false;
  res.status(AUTH_HTTP_STATUS[err.code]).json({ error: err.message });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT helpers
// ─────────────────────────────────────────────────────────────────────────────

interface TokenPayload {
  sub:   string;   // SafeDermatologo.id (UUID)
  email: string;
}

/** Shape del JWT después de jwt.verify(). */
type VerifiedPayload = TokenPayload & { iat: number; exp: number };

/**
 * Firma un par de tokens (access + refresh) para el dermatólogo dado.
 * El accessToken expira pronto (por defecto 15 min).
 * El refreshToken tiene vida larga (por defecto 7 días).
 */
function signTokens(user: Pick<SafeDermatologo, 'id' | 'email'>): {
  accessToken:  string;
  refreshToken: string;
} {
  const payload: TokenPayload = { sub: user.id, email: user.email };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log
// ─────────────────────────────────────────────────────────────────────────────

type AuditEvent =
  | 'REGISTER_OK'
  | 'REGISTER_FAIL'
  | 'LOGIN_OK'
  | 'LOGIN_FAIL'
  | 'TOKEN_REFRESH_OK'
  | 'TOKEN_REFRESH_FAIL';

/** Loguea eventos de seguridad. Solo activo en development; reemplazar por winston en prod. */
function auditLog(
  event: AuditEvent,
  req:   Request,
  meta?: Record<string, unknown>,
): void {
  if (!env.isDev) return;
  console.warn(
    `[AUDIT] ${new Date().toISOString()}  ${event}` +
    `  ip=${req.ip ?? '-'}` +
    `  ua="${req.get('user-agent') ?? '-'}"`,
    meta ?? '',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// req.body shapes — Zod en la ruta garantiza estas formas al llegar aquí
// ─────────────────────────────────────────────────────────────────────────────

interface RegisterBody {
  email:         string;
  password:      string;
  nombre:        string;
  apellido?:     string;
  especialidad?: string;
  numeroCedula?: string;
  telefono?:     string;
}

interface LoginBody {
  email:    string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra un nuevo dermatólogo.
 *
 * 201  { message, user, accessToken, refreshToken }
 * 409  { error }              — correo duplicado
 * 422  { error, fields }      — validación Zod (middleware)
 */
export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterBody;

  let user: SafeDermatologo;

  try {
    user = await createUser(body);
  } catch (err) {
    auditLog('REGISTER_FAIL', req, { email: body.email, error: (err as Error).message });
    if (handleAuthError(res, err)) return;
    throw err;
  }

  const tokens = signTokens(user);
  auditLog('REGISTER_OK', req, { userId: user.id });

  res.status(201).json({
    message:      'Cuenta creada exitosamente.',
    user,
    accessToken:  tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Autentica a un dermatólogo existente.
 *
 * 200  { message, user, accessToken, refreshToken }
 * 401  { error }              — credenciales inválidas
 * 422  { error, fields }      — validación Zod (middleware)
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginBody;

  let user: SafeDermatologo;

  try {
    user = await validateCredentials(email, password);
  } catch (err) {
    auditLog('LOGIN_FAIL', req, { email, error: (err as Error).message });
    if (handleAuthError(res, err)) return;
    throw err;
  }

  const tokens = signTokens(user);
  auditLog('LOGIN_OK', req, { userId: user.id });

  res.status(200).json({
    message:      'Sesión iniciada.',
    user,
    accessToken:  tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renueva el accessToken a partir de un refreshToken válido.
 *
 * 200  { message, accessToken, refreshToken }
 * 400  { error }   — body sin refreshToken
 * 401  { error }   — token expirado, inválido o usuario eliminado
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshBody;

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken requerido.' });
    return;
  }

  // 1 ── Verificar firma y expiración
  let payload: VerifiedPayload;

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as VerifiedPayload;
  } catch (err) {
    auditLog('TOKEN_REFRESH_FAIL', req, { error: (err as Error).message });

    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Refresh token expirado. Inicia sesión nuevamente.' });
    } else {
      res.status(401).json({ error: 'Refresh token inválido.' });
    }
    return;
  }

  // 2 ── Confirmar que el usuario sigue existiendo en la BD
  const user = await findUserById(payload.sub);

  if (!user) {
    auditLog('TOKEN_REFRESH_FAIL', req, { reason: 'user_not_found', sub: payload.sub });
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }

  // 3 ── Emitir tokens frescos
  const tokens = signTokens(user);
  auditLog('TOKEN_REFRESH_OK', req, { userId: user.id });

  res.status(200).json({
    message:      'Tokens renovados.',
    accessToken:  tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el perfil del dermatólogo autenticado.
 * Requiere middleware `authenticate` antes de este handler.
 *
 * Se consulta BD (no se usa el snapshot del token) para garantizar
 * datos frescos: plan actualizado, cuenta no eliminada, email cambiado.
 *
 * 200  { user }
 * 401  { error }   — manejado por `authenticate` antes de llegar aquí
 * 404  { error }   — cuenta eliminada después de emitir el token
 */
export async function me(req: Request, res: Response): Promise<void> {
  // req.user inyectado por authMiddleware.ts → tipado en src/types/express.d.ts
  const userId = req.user?.sub;

  if (!userId) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  const user = await findUserById(userId);

  if (!user) {
    res.status(404).json({ error: 'Cuenta no encontrada.' });
    return;
  }

  res.status(200).json({ user });
}
