// ─────────────────────────────────────────────────────────────────────────────
// src/routes/consultas.routes.ts — Derma Copilot
// Rutas del módulo de chat clínico. Todas requieren autenticación.
// ─────────────────────────────────────────────────────────────────────────────

import { Router }                   from 'express';
import { z, ZodSchema }             from 'zod';
import type { NextFunction, Request, Response } from 'express';
import {
  mensaje,
  sugerencias,
  historial,
  guardar,
  reporte,
}                                   from '../controllers/consultas.controller';
import { authenticate }             from '../middleware/auth';

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────

const ContextoCasoSchema = z.object({
  sintomas:           z.string().min(1),
  diagnosticos:       z.array(z.string()).optional(),
  urgencia:           z.string().optional(),
  tratamientoActual:  z.string().optional(),
  notasAdicionales:   z.string().optional(),
}).optional();

const MensajeSchema = z.object({
  casoId:       z.string().uuid('casoId debe ser un UUID válido.'),
  mensaje:      z.string()
                  .min(2,    'El mensaje debe tener al menos 2 caracteres.')
                  .max(2000, 'El mensaje no puede superar 2000 caracteres.'),
  contextoCaso: ContextoCasoSchema,
});

const SugerenciasSchema = z.object({
  texto:        z.string().min(2).max(500),
  contextoCaso: ContextoCasoSchema,
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
      res.status(422).json({ error: 'Datos inválidos.', fields });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** POST /api/consultas/mensaje — respuesta SSE streaming */
router.post('/mensaje',     authenticate, validate(MensajeSchema),     mensaje);

/** POST /api/consultas/sugerencias — autocompletados rápidos */
router.post('/sugerencias', authenticate, validate(SugerenciasSchema), sugerencias);

/** GET  /api/consultas/:casoId — historial de la sesión */
router.get('/:casoId',      authenticate, historial);

/** POST /api/consultas/:casoId/guardar — marcar como guardada */
router.post('/:casoId/guardar',  authenticate, guardar);

/** POST /api/consultas/:casoId/reporte — generar reporte Markdown */
router.post('/:casoId/reporte',  authenticate, reporte);

export default router;
