// ─────────────────────────────────────────────────────────────────────────────
// src/middleware/validate.ts — Derma Copilot
// Middleware factory que valida req.body con un schema de Zod.
// Devuelve 422 con errores por campo si la validación falla.
// Uso: router.post('/register', validate(RegisterSchema), handler)
// ─────────────────────────────────────────────────────────────────────────────
import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(422).json({
        error:  'Datos inválidos',
        fields: errors,
      });
      return;
    }

    // Replace req.body with the parsed + coerced value
    req.body = result.data as unknown;
    next();
  };
}
