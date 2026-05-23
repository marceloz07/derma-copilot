// ─────────────────────────────────────────────────────────────────────────────
// src/routes/reportes.routes.ts — Derma Copilot
//
// Endpoints del módulo de reportes clínicos:
//   POST  /api/reportes/generar      →  Genera reporte HTML + PDF  [auth]
//   GET   /api/reportes/:id          →  Obtiene datos del reporte   [auth]
//   PUT   /api/reportes/:id          →  Actualiza y regenera        [auth]
//   GET   /api/reportes/:id/pdf      →  Descarga PDF binario        [auth]
//   POST  /api/reportes/:id/enviar   →  Envía email al paciente     [auth]
// ─────────────────────────────────────────────────────────────────────────────

import { Router }             from 'express';
import { z, ZodSchema }       from 'zod';
import { NextFunction, Request, Response } from 'express';
import { authenticate }       from '../middleware/auth';
import {
  listar,
  generar,
  obtener,
  actualizar,
  descargarPdf,
  enviar,
}                             from '../controllers/reportes.controller';

const router = Router();

// ── Validate middleware ────────────────────────────────────────────────────────

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

// ── Schemas ────────────────────────────────────────────────────────────────────

const MedicamentoSchema = z.object({
  nombre:        z.string().min(1),
  dosis:         z.string().min(1),
  frecuencia:    z.string().min(1),
  duracion:      z.string().min(1),
  instrucciones: z.string().optional(),
});

const DatosEditablesSchema = z.object({
  pacienteNombre:          z.string().default(''),
  pacienteEmail:           z.string().default(''),
  pacienteEdad:            z.string().default(''),
  diagnosticoPrincipal:    z.string().default(''),
  diagnosticosSecundarios: z.array(z.string()).default([]),
  hallazgosClinica:        z.string().default(''),
  planTratamiento:         z.string().default(''),
  medicamentos:            z.array(MedicamentoSchema).default([]),
  recomendaciones:         z.array(z.string()).default([]),
  seguimiento:             z.string().default(''),
  notasMedico:             z.string().default(''),
});

const GenerarSchema = z.object({
  casoId:          z.string().uuid('casoId debe ser un UUID válido.'),
  consultaId:      z.string().uuid().optional(),
  datosEditables:  DatosEditablesSchema.partial().optional(),
});

const EnviarSchema = z.object({
  emailDestino:    z.string().email('emailDestino debe ser un email válido.'),
  nombrePaciente:  z.string().optional(),
});

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get('/',         authenticate, listar);
router.post('/generar', authenticate, validate(GenerarSchema), generar);

router.get('/:id',            authenticate, obtener);
router.put('/:id',            authenticate, validate(DatosEditablesSchema), actualizar);
router.get('/:id/pdf',        authenticate, descargarPdf);
router.post('/:id/enviar',    authenticate, validate(EnviarSchema), enviar);

export default router;
