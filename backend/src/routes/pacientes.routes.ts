// ─────────────────────────────────────────────────────────────────────────────
// src/routes/pacientes.routes.ts — Derma Copilot
// ─────────────────────────────────────────────────────────────────────────────

import { Router }       from 'express';
import { z, ZodSchema } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listar, crear, obtener, actualizar,
}                       from '../controllers/pacientes.controller';

const router = Router();

function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = result.error.errors.map(e => ({
        field: e.path.join('.') || '_body', message: e.message,
      }));
      res.status(422).json({ error: 'Datos de entrada inválidos.', fields });
      return;
    }
    req.body = result.data;
    next();
  };
}

const CrearSchema = z.object({
  nombre:          z.string().min(1, 'El nombre es requerido.').max(100),
  apellido:        z.string().max(100).optional(),
  email:           z.string().email('Email inválido.').optional().or(z.literal('')),
  telefono:        z.string().max(20).optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD.').optional().or(z.literal('')),
  genero:          z.enum(['Masculino','Femenino','Otro','No especificado']).optional(),
  notas:           z.string().max(500).optional(),
});

const ActualizarSchema = CrearSchema.partial().extend({
  estado: z.enum(['activo','inactivo']).optional(),
});

router.get('/',     authenticate, listar);
router.post('/',    authenticate, validate(CrearSchema),     crear);
router.get('/:id',  authenticate, obtener);
router.put('/:id',  authenticate, validate(ActualizarSchema), actualizar);

export default router;
