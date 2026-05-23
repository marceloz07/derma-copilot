import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { ApiResponse, AuthRequest, UserRole } from '../types';

// ── Schemas de validación ─────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  role: z.nativeEnum(UserRole).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

// ── POST /auth/register ───────────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    const result = await authService.register(dto);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: result,
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await authService.login(dto);

    res.status(200).json({
      success: true,
      message: 'Sesión iniciada correctamente',
      data: result,
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Tokens renovados',
      data: tokens,
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      message: 'Perfil del usuario autenticado',
      data: req.user,
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
