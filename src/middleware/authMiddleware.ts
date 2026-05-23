// ─────────────────────────────────────────────────────────────────────────────
// src/middleware/authMiddleware.ts — Derma Copilot
//
// Middleware de autenticación JWT.
// Lee el token del header  Authorization: Bearer <token>
// Verifica firma y expiración con JWT_SECRET.
// Adjunta el payload decodificado a req.user.
//
// Exports:
//   authenticate   — ruta protegida: 401 si el token es inválido o falta
//   optionalAuth   — ruta pública con contexto: adjunta req.user si el token
//                    es válido, pero nunca bloquea la petición
//
// Uso típico:
//   router.get('/me',      authenticate, meHandler)
//   router.get('/feed',    optionalAuth, feedHandler)
// ─────────────────────────────────────────────────────────────────────────────

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mapea errores de la librería jsonwebtoken a mensajes legibles en español.
 * No expone detalles internos al cliente.
 */
function jwtErrorMessage(err: unknown): string {
  if (err instanceof jwt.TokenExpiredError) {
    return 'El token ha expirado. Inicia sesión nuevamente.';
  }
  if (err instanceof jwt.NotBeforeError) {
    return 'El token aún no es válido.';
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return 'Token inválido o malformado.';
  }
  return 'Error de autenticación.';
}

/**
 * Log de seguridad — solo activo en development.
 * En producción sustituir por un logger estructurado (winston, pino).
 */
function securityLog(
  event: string,
  req:   Request,
  extra?: Record<string, unknown>,
): void {
  if (!env.isDev) return;

  console.warn(
    `[SECURITY] ${new Date().toISOString()}  ${event}` +
    `  ip=${req.ip ?? '-'}` +
    `  ua="${req.get('user-agent') ?? '-'}"`,
    extra ?? '',
  );
}

// ── Tipos internos ────────────────────────────────────────────────────────────

/** Shape del payload después de jwt.verify() — debe coincidir con signTokens(). */
interface JwtTokenPayload {
  sub:   string;
  email: string;
  iat:   number;
  exp:   number;
}

// ── authenticate ──────────────────────────────────────────────────────────────

/**
 * Middleware de autenticación requerida.
 *
 * 1. Extrae el token del header `Authorization: Bearer <token>`.
 * 2. Verifica firma y expiración con JWT_SECRET.
 * 3. Adjunta el payload decodificado a `req.user`.
 * 4. Llama a `next()` si todo es correcto; responde 401 en caso contrario.
 *
 * Respuestas de error:
 *   401  — header ausente o sin formato "Bearer ..."
 *   401  — token expirado (TokenExpiredError)
 *   401  — token malformado o firma inválida (JsonWebTokenError)
 */
export function authenticate(
  req:  Request,
  res:  Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  // ── 1. Presence & format check ─────────────────────────────────────────────
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    securityLog('AUTH_MISSING_TOKEN', req);
    res.status(401).json({ error: 'Token de autenticación no proporcionado.' });
    return;
  }

  // ── 2. Extract raw token ───────────────────────────────────────────────────
  const token = authHeader.slice(7); // remove "Bearer "

  if (!token) {
    securityLog('AUTH_EMPTY_TOKEN', req);
    res.status(401).json({ error: 'Token de autenticación vacío.' });
    return;
  }

  // ── 3. Verify ──────────────────────────────────────────────────────────────
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;

    // Attach to request — type is declared in src/types/express.d.ts
    req.user = {
      sub:   payload.sub,
      email: payload.email,
      iat:   payload.iat,
      exp:   payload.exp,
    };

    next();
  } catch (err) {
    securityLog('AUTH_INVALID_TOKEN', req, { error: (err as Error).message });
    res.status(401).json({ error: jwtErrorMessage(err) });
  }
}

// ── optionalAuth ──────────────────────────────────────────────────────────────

/**
 * Middleware de autenticación opcional.
 *
 * - Si hay un token válido en el header → adjunta `req.user` y llama a `next()`.
 * - Si no hay token, o el token es inválido → llama a `next()` igualmente
 *   (nunca bloquea la petición).
 *
 * Útil para rutas públicas que se personalizan cuando el usuario está logueado.
 */
export function optionalAuth(
  req:  Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;

    req.user = {
      sub:   payload.sub,
      email: payload.email,
      iat:   payload.iat,
      exp:   payload.exp,
    };
  } catch {
    // Token inválido en ruta pública → ignorar silenciosamente
  }

  next();
}
