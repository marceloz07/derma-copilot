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
  // Errores de validación Zod que burbujean hasta aquí
  // (normalmente capturados en validate() de las rutas, pero por si acaso)
  if (err instanceof ZodError) {
    const fields = err.errors.map((e) => ({
      field:   e.path.join('.') || '_body',
      message: e.message,
    }));
    res.status(422).json({ error: 'Datos de entrada inválidos.', fields });
    return;
  }

  // Errores operacionales conocidos (409, 401, 404, 400…)
  // Usamos `error` (no `message`) para que el frontend pueda leerlo con data['error']
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Errores inesperados — no exponer detalles en producción
  console.error('🔴 Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.isDev && { detail: err.stack }),
  });
}

// ── 404 ───────────────────────────────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  } satisfies ApiResponse);
}
