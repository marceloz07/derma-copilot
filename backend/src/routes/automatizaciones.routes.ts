// ─────────────────────────────────────────────────────────────────────────────
// src/routes/automatizaciones.routes.ts — Derma Copilot
// ─────────────────────────────────────────────────────────────────────────────

import { Router }                          from 'express';
import { z, ZodSchema }                    from 'zod';
import { NextFunction, Request, Response } from 'express';
import { authenticate }                    from '../middleware/auth';
import * as ctrl                           from '../controllers/automatizaciones.controller';

const router = Router();

// ── Validación por Zod ────────────────────────────────────────────────────────

function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error:  'Datos de entrada inválidos.',
        fields: result.error.errors.map(e => ({
          field:   e.path.join('.') || '_body',
          message: e.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  gcalCrearEvento:     z.boolean().optional(),
  gcalRecordatorio24h: z.boolean().optional(),
  waEnviarPropuesta:   z.boolean().optional(),
  waRecordatorio24h:   z.boolean().optional(),
  waReportePaciente:   z.boolean().optional(),
  smsConfirmacion:     z.boolean().optional(),
  smsRecordatorio48h:  z.boolean().optional(),
}).strict();

const WhatsAppConexionSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Formato inválido. Ejemplo: +573001234567'),
});

const SMSConexionSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Formato inválido. Ejemplo: +573001234567'),
});

const CrearEventoSchema = z.object({
  casoId:           z.string().min(1),
  fechaCita:        z.string().datetime({ message: 'fechaCita debe ser ISO 8601' }),
  duracionMinutos:  z.number().int().min(15).max(480).optional(),
  titulo:           z.string().max(200).optional(),
  descripcion:      z.string().max(1000).optional(),
  pacienteNombre:   z.string().max(200).optional(),
});

const EnviarWASchema = z.object({
  pacienteId:  z.string().min(1),
  tipoMensaje: z.enum(['propuesta', 'recordatorio', 'reporte']),
  telefono:    z.string().regex(/^\+[1-9]\d{7,14}$/, 'Número inválido. Ej: +573001234567'),
  datos:       z.record(z.string()).optional(),
});

const EnviarSMSSchema = z.object({
  pacienteId:  z.string().min(1),
  tipoMensaje: z.enum(['confirmacion', 'recordatorio']),
  telefono:    z.string().regex(/^\+[1-9]\d{7,14}$/, 'Número inválido. Ej: +573001234567'),
  datos:       z.record(z.string()).optional(),
});

// ── Rutas de estado ───────────────────────────────────────────────────────────

router.get( '/',       authenticate, ctrl.getEstado);
router.put( '/config', authenticate, validate(ConfigSchema), ctrl.updateConfig);
router.get( '/logs',   authenticate, ctrl.getLogs);

// ── Google Calendar ───────────────────────────────────────────────────────────

router.post('/conectar-google',    authenticate, ctrl.conectarGoogle);
router.get( '/google/callback',    ctrl.googleCallback);   // sin auth: llega desde Google
router.post('/desconectar-google', authenticate, ctrl.desconectarGoogle);

// ── WhatsApp Business ─────────────────────────────────────────────────────────

router.post('/conectar-whatsapp',    authenticate, validate(WhatsAppConexionSchema), ctrl.conectarWhatsApp);
router.post('/desconectar-whatsapp', authenticate, ctrl.desconectarWhatsApp);

// ── SMS ───────────────────────────────────────────────────────────────────────

router.post('/conectar-sms',    authenticate, validate(SMSConexionSchema), ctrl.conectarSMS);
router.post('/desconectar-sms', authenticate, ctrl.desconectarSMS);

// ── Acciones ──────────────────────────────────────────────────────────────────

router.post('/crear-evento',     authenticate, validate(CrearEventoSchema), ctrl.crearEvento);
router.post('/enviar-whatsapp',  authenticate, validate(EnviarWASchema),    ctrl.enviarWhatsAppCtrl);
router.post('/enviar-sms',       authenticate, validate(EnviarSMSSchema),   ctrl.enviarSMSCtrl);

export default router;
