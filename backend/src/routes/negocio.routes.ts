// ─────────────────────────────────────────────────────────────────────────────
// src/routes/negocio.routes.ts — Derma Copilot
// ─────────────────────────────────────────────────────────────────────────────

import { Router }                          from 'express';
import { z, ZodSchema }                    from 'zod';
import { NextFunction, Request, Response } from 'express';
import { authenticate }                    from '../middleware/auth';
import * as ctrl                           from '../controllers/negocio.controller';

const router = Router();

function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error:  'Datos de entrada inválidos.',
        fields: result.error.errors.map(e => ({ field: e.path.join('.') || '_body', message: e.message })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const PrecioSchema = z.object({
  tratamiento:     z.string().min(1, 'El tratamiento es requerido.'),
  zona:            z.string().min(1, 'La zona es requerida.'),
  precioFinal:     z.number().positive('El precio debe ser positivo.'),
  posicionamiento: z.enum(['economico', 'promedio', 'premium', 'ultra-premium']).optional(),
  notas:           z.string().max(500).optional(),
});

const PaqueteSchema = z.object({
  nombre:          z.string().min(1).max(100),
  tipo:            z.enum(['basico', 'estandar', 'premium']),
  tratamiento:     z.string().min(1).max(120),
  sesiones:        z.number().int().positive(),
  duracionMinutos: z.number().int().positive(),
  periodicidad:    z.string().min(1).max(100),
  precioFinal:     z.number().positive(),
  descripcion:     z.string().max(500).optional(),
});

const AceptacionSchema = z.object({
  aceptado:    z.boolean(),
  pacienteRef: z.string().max(200).optional(),
});

// ── Rutas de consulta ─────────────────────────────────────────────────────────

router.get('/catalogo',     authenticate, ctrl.catalogo);
router.get('/benchmarking', authenticate, ctrl.benchmarking);
router.get('/sugerencias',  authenticate, ctrl.sugerencias);
router.get('/scripts',      authenticate, ctrl.scripts);
router.get('/analytics',    authenticate, ctrl.analytics);

// ── Precios registrados ───────────────────────────────────────────────────────

router.get( '/precios', authenticate,                     ctrl.listarPrecios);
router.post('/precios', authenticate, validate(PrecioSchema), ctrl.registrarPrecio);

// ── Paquetes personalizados ───────────────────────────────────────────────────

router.get( '/paquetes',                authenticate,                                  ctrl.listarPaquetes);
router.post('/paquetes',                authenticate, validate(PaqueteSchema),          ctrl.crearPaquete);
router.put( '/paquetes/:id',            authenticate, validate(PaqueteSchema.partial()), ctrl.actualizarPaquete);
router.post('/paquetes/:id/aceptacion', authenticate, validate(AceptacionSchema),       ctrl.registrarAceptacion);

export default router;
