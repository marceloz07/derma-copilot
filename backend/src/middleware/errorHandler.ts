import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { ApiResponse } from '../types';

// ── Clase para errores operacionales ─────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Middleware de manejo global de errores ────────────────────────────────────
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Errores de validación Zod
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const field = e.path.join('.');
      errors[field] = errors[field] ? [...errors[field], e.message] : [e.message];
    });
    res.status(422).json({
      success: false,
      message: 'Error de validación',
      errors,
    } satisfies ApiResponse);
    return;
  }

  // Errores operacionales conocidos
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    } satisfies ApiResponse);
    return;
  }

  // Errores inesperados — no exponer detalles en producción
  console.error('🔴 Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(env.isDev && { data: { stack: err.stack } }),
  } satisfies ApiResponse);
}

// ── 404 ───────────────────────────────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  } satisfies ApiResponse);
}
