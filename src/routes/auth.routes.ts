// ─────────────────────────────────────────────────────────────────────────────
// src/routes/auth.routes.ts — Derma Copilot
//
// Rutas de autenticación:
//   POST /api/auth/register  →  Registro de nuevo dermatólogo
//   POST /api/auth/login     →  Inicio de sesión
//   POST /api/auth/refresh   →  Renovar access token
//   GET  /api/auth/me        →  Perfil del usuario autenticado
//
// Pipeline por ruta:
//   authLimiter → validate(schema) → controller
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env';
import { login, me, refresh, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';

export const authRouter = Router();

// ── Rate limiter (más estricto que el global) ─────────────────────────────────
const authLimiter = rateLimit({
  windowMs:        env.RATE_LIMIT_WINDOW_MS,
  max:             env.AUTH_RATE_LIMIT_MAX,
  message:         { error: 'Demasiados intentos de autenticación. Intenta de nuevo más tarde.' },
  standardHeaders: true,   // RateLimit-* headers (RFC 6585)
  legacyHeaders:   false,  // X-RateLimit-* headers desactivados
});

// ── Zod validation schemas ────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8,   'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede superar 100 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  nombre:       z.string().min(1, 'El nombre es requerido').max(100),
  apellido:     z.string().max(100).optional(),
  especialidad: z.string().max(100).optional(),
  numeroCedula: z.string().max(50).optional(),
  telefono:     z.string().max(20).optional(),
});

const LoginSchema = z.object({
  email:    z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken requerido'),
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Registra un nuevo dermatólogo y devuelve tokens JWT.
 *
 * Body    : { email, password, nombre, apellido?, especialidad?, numeroCedula?, telefono? }
 * 201     : { message, user, accessToken, refreshToken }
 * 409     : { error }   — correo ya registrado
 * 422     : { error, fields }   — validación fallida
 */
authRouter.post(
  '/register',
  authLimiter,
  validate(RegisterSchema),
  register,
);

/**
 * POST /api/auth/login
 * Autentica un dermatólogo y devuelve tokens JWT.
 *
 * Body    : { email, password }
 * 200     : { message, user, accessToken, refreshToken }
 * 401     : { error }   — credenciales inválidas
 * 422     : { error, fields }   — validación fallida
 */
authRouter.post(
  '/login',
  authLimiter,
  validate(LoginSchema),
  login,
);

/**
 * POST /api/auth/refresh
 * Renueva el accessToken con un refreshToken válido.
 *
 * Body    : { refreshToken }
 * 200     : { message, accessToken, refreshToken }
 * 400     : { error }   — refreshToken no proporcionado
 * 401     : { error }   — token expirado o inválido
 */
authRouter.post(
  '/refresh',
  validate(RefreshSchema),
  refresh,
);

/**
 * GET /api/auth/me
 * Devuelve el perfil del dermatólogo autenticado.
 * Requiere header: Authorization: Bearer <accessToken>
 *
 * 200     : { user }
 * 401     : { error }   — token ausente, expirado o inválido
 * 404     : { error }   — cuenta no encontrada
 */
authRouter.get('/me', authenticate, me);

export default authRouter;
