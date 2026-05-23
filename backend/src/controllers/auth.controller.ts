/**
 * @file auth.controller.ts
 * @description Controlador de autenticación para Derma Copilot.
 *
 * Handlers exportados:
 *  register        → POST  /api/auth/register
 *  login           → POST  /api/auth/login
 *  logout          → POST  /api/auth/logout
 *  refresh         → POST  /api/auth/refresh
 *  me              → GET   /api/auth/me
 *  changePassword  → PATCH /api/auth/password
 *
 * Contrato con las rutas:
 *  · La validación Zod ya fue ejecutada por validate() en auth.routes.ts.
 *    req.body llega normalizado y garantizado — no hay validación duplicada aquí.
 *  · authenticate() ya fue ejecutado en rutas protegidas; req.user está presente.
 */

import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { UserModel } from '../models/User';
import { authService } from '../services/authService';
import { ApiResponse, AuthRequest } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: convierte errores del servicio en AppError con el HTTP status exacto
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_ERROR_MAP: Array<[RegExp, number]> = [
  [/correo.*registrado|email.*exist/i,            409], // Conflict
  [/credenciales.*inválidas|invalid.*credential/i, 401], // Unauthorized
  [/token.*inválido|token.*expirado/i,             401],
  [/usuario.*no.*encontrado|user.*not.*found/i,    404], // Not Found
  [/contraseña.*incorrecta|wrong.*password/i,      400], // Bad Request
];

function toAppError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : 'Error desconocido';
  for (const [pattern, status] of SERVICE_ERROR_MAP) {
    if (pattern.test(message)) return new AppError(status, message);
  }
  // Error no mapeado → no operacional; el handler global lo tratará como 500
  return new AppError(500, message, false);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: log de auditoría para eventos de seguridad
// ─────────────────────────────────────────────────────────────────────────────

function auditLog(
  event: 'REGISTER' | 'LOGIN' | 'LOGOUT' | 'REFRESH' | 'PASSWORD_CHANGE' |
         'LOGIN_FAILED' | 'REGISTER_FAILED',
  req: Request,
  meta?: Record<string, unknown>,
): void {
  // En producción, enviar a un sistema de logging (Winston, Datadog, etc.)
  if (env.isDev) {
    console.log(`[AUDIT] ${new Date().toISOString()} ${event}`, {
      ip:   req.ip,
      ua:   req.headers['user-agent']?.slice(0, 80),
      path: req.originalUrl,
      ...meta,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra un nuevo usuario y devuelve access + refresh tokens.
 *
 * req.body  (validado por ruta): { name, email, password, role? }
 *
 * 201 → { user: SafeUser, tokens: AuthTokens }
 * 409 → email ya registrado
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.register(req.body);

    auditLog('REGISTER', req, { userId: result.user.id, email: result.user.email });

    res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente.',
      data: result,
    } satisfies ApiResponse);
  } catch (err) {
    auditLog('REGISTER_FAILED', req, { email: req.body?.email, reason: String(err) });
    next(err instanceof AppError ? err : toAppError(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Autentica credenciales y devuelve access + refresh tokens.
 *
 * req.body  (validado por ruta): { email, password }
 *
 * 200 → { user: SafeUser, tokens: AuthTokens }
 * 401 → credenciales inválidas  (mensaje genérico — no revela si el email existe)
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(req.body);

    auditLog('LOGIN', req, { userId: result.user.id, email: result.user.email });

    res.status(200).json({
      success: true,
      message: 'Sesión iniciada correctamente.',
      data: result,
    } satisfies ApiResponse);
  } catch (err) {
    auditLog('LOGIN_FAILED', req, { email: req.body?.email });
    next(err instanceof AppError ? err : toAppError(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cierra la sesión del usuario autenticado.
 *
 * Implementación actual: stateless — el servidor confirma y el cliente descarta
 * sus tokens. Para invalidación real en servidor, implementar una blacklist con
 * Redis usando `req.user.exp` como TTL.
 *
 * Headers: Authorization: Bearer <accessToken>
 *
 * 200 → confirmación
 * 401 → token faltante o inválido  (manejado por authenticate en la ruta)
 *
 * TODO: await tokenBlacklist.revoke(req.user!.userId, req.user!.exp!);
 */
export async function logout(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    auditLog('LOGOUT', req, { userId: req.user?.userId });

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada. Descarta tus tokens en el cliente.',
    } satisfies ApiResponse);
  } catch (err) {
    next(toAppError(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renueva el access token usando un refresh token válido.
 *
 * req.body  (validado por ruta): { refreshToken }
 *
 * 200 → { accessToken, refreshToken, expiresIn }
 * 401 → refresh token inválido o expirado
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tokens = await authService.refreshTokens(req.body.refreshToken as string);

    auditLog('REFRESH', req);

    res.status(200).json({
      success: true,
      message: 'Tokens renovados correctamente.',
      data: tokens,
    } satisfies ApiResponse);
  } catch (err) {
    next(err instanceof AppError ? err : toAppError(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el perfil completo del usuario autenticado desde la base de datos.
 * Siempre refleja el estado actual (nombre, rol, etc.), no solo el snapshot del token.
 *
 * Headers: Authorization: Bearer <accessToken>
 *
 * 200 → { id, name, email, role, createdAt, updatedAt }
 * 401 → token faltante o inválido  (manejado por authenticate en la ruta)
 * 404 → usuario eliminado después de emitir el token
 */
export async function me(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await UserModel.findById(req.user!.userId);
    if (!user) throw new AppError(404, 'Usuario no encontrado. La cuenta pudo haber sido eliminada.');

    res.status(200).json({
      success: true,
      message: 'Perfil del usuario autenticado.',
      data: UserModel.sanitize(user),
    } satisfies ApiResponse);
  } catch (err) {
    next(err instanceof AppError ? err : toAppError(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/password
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cambia la contraseña del usuario autenticado.
 *
 * req.body  (validado por ruta): { currentPassword, newPassword }
 *
 * Pasos:
 *  1. Obtiene el usuario completo (con hash) desde la BD.
 *  2. Verifica que currentPassword coincida con el hash almacenado.
 *  3. Rechaza si newPassword es igual a currentPassword.
 *  4. Hashea y persiste la nueva contraseña.
 *
 * 200 → confirmación (no devuelve tokens nuevos — el cliente puede re-login si lo necesita)
 * 400 → contraseña actual incorrecta  |  nueva igual a la actual
 * 401 → token faltante o inválido     (manejado por authenticate en la ruta)
 * 404 → usuario no encontrado
 */
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    // 1. Obtener usuario con hash
    const user = await UserModel.findById(req.user!.userId);
    if (!user) throw new AppError(404, 'Usuario no encontrado.');

    // 2. Verificar contraseña actual
    const valid = await UserModel.verifyPassword(currentPassword, user.password);
    if (!valid) throw new AppError(400, 'La contraseña actual es incorrecta.');

    // 3. Evitar reutilizar la misma contraseña
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) throw new AppError(400, 'La nueva contraseña debe ser diferente a la actual.');

    // 4. Hashear y persistir
    const hashed = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    const updated = await UserModel.updatePassword(user.id, hashed);
    if (!updated) throw new AppError(500, 'No se pudo actualizar la contraseña.', false);

    auditLog('PASSWORD_CHANGE', req, { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente.',
    } satisfies ApiResponse);
  } catch (err) {
    next(err instanceof AppError ? err : toAppError(err));
  }
}
