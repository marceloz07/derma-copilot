// ─────────────────────────────────────────────────────────────────────────────
// src/routes/casos.routes.ts — Derma Copilot
//
// Endpoints del módulo de análisis de casos:
//   POST  /api/casos/analizar   →  Análisis IA de imagen + síntomas [autenticado]
//   GET   /api/casos            →  Lista de casos del usuario         [autenticado]
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { z, ZodSchema } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { analizar, listarCasos, obtenerCaso } from '../controllers/casos.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── Schemas de validación ─────────────────────────────────────────────────────

const AnalizarSchema = z.object({
  sintomas: z
    .string({ required_error: 'Los síntomas son requeridos.' })
    .min(10, 'Describe los síntomas con al menos 10 caracteres.')
    .max(2000, 'Los síntomas no pueden superar 2000 caracteres.'),

  imagenBase64: z.string().optional(),

  mimeType: z
    .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'], {
      errorMap: () => ({ message: 'Formato de imagen no soportado.' }),
    })
    .optional(),
});

// ── Middleware validate ────────────────────────────────────────────────────────

function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = result.error.errors.map(e => ({
        field:   e.path.join('.') || '_body',
        message: e.message,
      }));
      res.status(422).json({ error: 'Datos de entrada inválidos.', fields });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/casos/analizar
 *
 * Body:  { sintomas, imagenBase64?, mimeType? }
 * 201:   { message, casoId, analisis }
 * 422:   { error, fields }
 */
router.post('/analizar', authenticate, validate(AnalizarSchema), analizar);

/**
 * GET /api/casos
 *
 * 200:  { casos: [...] }
 */
router.get('/',    authenticate, listarCasos);
router.get('/:id', authenticate, obtenerCaso);

export default router;
