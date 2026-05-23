/**
 * @file auth.ts
 * @description Middleware de autenticación y autorización JWT para Derma Copilot.
 *
 * Exports:
 *  - authenticate        → verifica Bearer token, rechaza si falta o es inválido
 *  - optionalAuth        → igual que authenticate pero no rechaza si no hay token
 *  - authorize(...roles) → guard de roles; usar siempre DESPUÉS de authenticate
 *  - requireOwnership    → verifica que el usuario sea dueño del recurso
 */

import { NextFunction, Request, Response } from 'express';
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, JwtPayload, UserRole } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/** Extrae el token del header `Authorization: Bearer <token>`. */
function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Verifica y decodifica un access token JWT. Lanza errores tipados de jsonwebtoken. */
function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/** Mapea los errores de jsonwebtoken a mensajes amigables para el cliente. */
function jwtErrorMessage(err: unknown): string {
  if (err instanceof TokenExpiredError) {
    return 'El token ha expirado. Inicia sesión nuevamente.';
  }
  if (err instanceof NotBeforeError) {
    return 'El token aún no es válido.';
  }
  if (err instanceof JsonWebTokenError) {
    return 'Token inválido o malformado.';
  }
  return 'Error de autenticación.';
}

/** Log de seguridad (solo en desarrollo para evitar fuga de datos en prod). */
function securityLog(event: string, req: Request, extra?: Record<string, unknown>): void {
  if (!env.isDev) return;
  console.warn(`[AUTH] ${event}`, {
    ip: req.ip,
    path: req.originalUrl,
    method: req.method,
    ua: req.headers['user-agent']?.slice(0, 60),
    ...extra,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// authenticate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que la petición incluya un Bearer token JWT válido.
 *
 * - Si no hay token        → 401 "Token de autenticación requerido"
 * - Si expiró              → 401 "El token ha expirado…"
 * - Si es inválido         → 401 "Token inválido o malformado"
 * - Si es válido           → adjunta `req.user` y llama `next()`
 *
 * @example
 * router.get('/perfil', authenticate, (req: AuthRequest, res) => {
 *   res.json(req.user);
 * });
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    securityLog('TOKEN_MISSING', req);
    // Usamos 'error' (no 'message') para que el frontend lo lea con data['error']
    res.status(401).json({ error: 'Token de autenticación requerido.' });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    securityLog('TOKEN_INVALID', req, { reason: (err as Error).message });
    res.status(401).json({ error: jwtErrorMessage(err) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// optionalAuth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Igual que `authenticate` pero **no bloquea** si no hay token.
 * Útil en rutas públicas que muestran contenido extra cuando el usuario está autenticado.
 *
 * - Sin token / token inválido → `req.user` queda `undefined`, llama `next()`
 * - Token válido               → adjunta `req.user`, llama `next()`
 *
 * @example
 * router.get('/articulos', optionalAuth, (req: AuthRequest, res) => {
 *   if (req.user) { ... mostrar contenido premium ... }
 * });
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Token inválido en ruta opcional → simplemente no se adjunta usuario
      req.user = undefined;
    }
  }

  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// authorize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guard de roles. Debe usarse **siempre después** de `authenticate`.
 * Rechaza con 403 si el rol del usuario autenticado no está en la lista.
 *
 * @param roles  Uno o más `UserRole` permitidos.
 *
 * @example
 * router.delete(
 *   '/paciente/:id',
 *   authenticate,
 *   authorize(UserRole.ADMIN, UserRole.DOCTOR),
 *   deletePatient,
 * );
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Protección extra: no debería llegar aquí sin `authenticate` previo
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      securityLog('ROLE_DENIED', req, {
        userRole: req.user.role,
        required: roles,
        userId: req.user.userId,
      });
      res.status(403).json({ error: `Acceso denegado. Rol requerido: ${roles.join(' | ')}.` });
      return;
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireOwnership
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que el usuario autenticado sea el dueño del recurso,
 * o tenga rol ADMIN (los admins siempre pueden).
 *
 * @param getResourceUserId  Función que recibe `req` y devuelve el userId del recurso.
 *                           Puede ser síncrona o asíncrona.
 *
 * @example
 * router.put(
 *   '/consulta/:id',
 *   authenticate,
 *   requireOwnership((req) => ConsultaService.getOwnerId(req.params.id)),
 *   updateConsulta,
 * );
 */
export function requireOwnership(
  getResourceUserId: (req: AuthRequest) => string | Promise<string>,
) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }

    // Los ADMIN tienen acceso total
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    try {
      const resourceUserId = await getResourceUserId(req);

      if (req.user.userId !== resourceUserId) {
        securityLog('OWNERSHIP_DENIED', req, {
          userId: req.user.userId,
          resourceOwner: resourceUserId,
        });
        res.status(403).json({ error: 'No tienes permiso para acceder a este recurso.' });
        return;
      }

      next();
    } catch (err) {
      next(err); // delega al error handler global
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export de tipos útiles para quien importe desde este módulo
// ─────────────────────────────────────────────────────────────────────────────
export type { AuthRequest, JwtPayload };
export { UserRole };
