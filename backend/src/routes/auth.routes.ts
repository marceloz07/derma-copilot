/**
 * @file auth.routes.ts
 * @description Rutas de autenticación para Derma Copilot.
 *
 * Endpoints:
 *  POST   /api/auth/register   → crea cuenta y devuelve tokens
 *  POST   /api/auth/login      → inicia sesión y devuelve tokens
 *  POST   /api/auth/logout     → cierra sesión (stateless: invalida en cliente)
 *  POST   /api/auth/refresh    → renueva access token con refresh token
 *  GET    /api/auth/me         → perfil completo del usuario autenticado [privado]
 *  PATCH  /api/auth/password   → cambia contraseña del usuario autenticado [privado]
 */

import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z, ZodSchema } from 'zod';
import {
  changePassword,
  login,
  logout,
  me,
  refresh,
  register,
} from '../controllers/auth.controller';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { ApiResponse, UserRole } from '../types';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiter específico para auth
// Mucho más estricto que el global: evita fuerza bruta en login/register.
// ─────────────────────────────────────────────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,         // controlado por AUTH_RATE_LIMIT_MAX en .env
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown', // limita por IP
  message: {
    success: false,
    message: 'Demasiados intentos. Espera 15 minutos antes de reintentar.',
  } satisfies ApiResponse,
  skipSuccessfulRequests: true, // solo cuenta los fallidos
});

// ─────────────────────────────────────────────────────────────────────────────
// Schemas de validación Zod
// ─────────────────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .trim(),

  apellido: z
    .string()
    .max(100, 'El apellido no puede superar los 100 caracteres')
    .trim()
    .optional(),

  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Correo electrónico inválido')
    .toLowerCase(),

  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'Máximo 72 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),

  especialidad: z
    .string()
    .max(100)
    .trim()
    .optional(),

  role: z.nativeEnum(UserRole).optional().default(UserRole.DOCTOR),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Email inválido')
    .toLowerCase(),

  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(1, 'La contraseña no puede estar vacía'),
});

const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'El refresh token es requerido' })
    .min(1, 'El refresh token no puede estar vacío'),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'La contraseña actual es requerida' })
    .min(1, 'La contraseña actual no puede estar vacía'),

  newPassword: z
    .string({ required_error: 'La nueva contraseña es requerida' })
    .min(8,  'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Middleware de validación genérico
// Ejecuta el schema Zod y, si falla, devuelve 422 con los errores por campo.
// Si pasa, sobreescribe req.body con el valor parseado (normalized).
// ─────────────────────────────────────────────────────────────────────────────
function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Formato compatible con el frontend: { error, fields: [{field, message}] }
      // El frontend muestra cada error en el input correspondiente.
      const fields = result.error.errors.map((e) => ({
        field:   e.path.join('.') || '_body',
        message: e.message,
      }));

      res.status(422).json({
        error:  'Datos de entrada inválidos.',
        fields,
      });
      return;
    }

    // Sobreescribe req.body con los datos normalizados por Zod
    // (emails en minúsculas, roles con default, strings trimados…)
    req.body = result.data;
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rutas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Registra un nuevo usuario y devuelve access + refresh tokens.
 *
 * Body:
 *  { name, email, password, role? }
 *
 * Respuestas:
 *  201 → { user, tokens }
 *  422 → errores de validación por campo
 *  409 → email ya registrado
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  register,
);

/**
 * POST /api/auth/login
 *
 * Autentica un usuario existente y devuelve access + refresh tokens.
 *
 * Body:
 *  { email, password }
 *
 * Respuestas:
 *  200 → { user, tokens }
 *  422 → errores de validación
 *  401 → credenciales inválidas (mensaje genérico, no revela si el email existe)
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  login,
);

/**
 * POST /api/auth/logout
 *
 * Cierre de sesión stateless: confirma al cliente que debe descartar sus tokens.
 * Para invalidación real en servidor, implementar una blacklist con Redis.
 *
 * Headers:
 *  Authorization: Bearer <accessToken>
 *
 * Respuestas:
 *  200 → mensaje de confirmación
 *  401 → token faltante o inválido
 */
router.post('/logout', authenticate, logout);

/**
 * POST /api/auth/refresh
 *
 * Renueva el access token usando un refresh token válido.
 *
 * Body:
 *  { refreshToken }
 *
 * Respuestas:
 *  200 → { accessToken, refreshToken, expiresIn }
 *  401 → refresh token inválido o expirado
 */
router.post(
  '/refresh',
  validate(refreshSchema),
  refresh,
);

/**
 * GET /api/auth/me
 *
 * Devuelve el payload decodificado del token del usuario autenticado.
 *
 * Headers:
 *  Authorization: Bearer <accessToken>
 *
 * Respuestas:
 *  200 → { userId, email, role, iat, exp }
 *  401 → token faltante o inválido
 */
router.get('/me', authenticate, me);

/**
 * PATCH /api/auth/password
 *
 * Cambia la contraseña del usuario autenticado.
 *
 * Headers:
 *  Authorization: Bearer <accessToken>
 *
 * Body:
 *  { currentPassword, newPassword }
 *
 * Respuestas:
 *  200 → contraseña actualizada
 *  400 → contraseña actual incorrecta | nueva igual a la actual
 *  401 → token faltante o inválido
 *  422 → errores de validación
 */
router.patch(
  '/password',
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
