// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/automatizaciones.controller.ts — Derma Copilot
//
// GET  /api/automatizaciones                            → config + estado conexiones
// PUT  /api/automatizaciones/config                    → actualizar toggles
// GET  /api/automatizaciones/logs                      → historial de ejecuciones
//
// POST /api/automatizaciones/conectar-google           → iniciar OAuth (retorna authUrl)
// GET  /api/automatizaciones/google/callback           → callback OAuth Google
// POST /api/automatizaciones/desconectar-google        → revocar conexión
//
// POST /api/automatizaciones/conectar-whatsapp         → conectar número WhatsApp
// POST /api/automatizaciones/desconectar-whatsapp      → desconectar WhatsApp
//
// POST /api/automatizaciones/conectar-sms              → conectar número SMS
// POST /api/automatizaciones/desconectar-sms           → desconectar SMS
//
// POST /api/automatizaciones/crear-evento              → crear evento Google Calendar
// POST /api/automatizaciones/enviar-whatsapp           → enviar WhatsApp vía Twilio
// POST /api/automatizaciones/enviar-sms                → enviar SMS vía Twilio
// ─────────────────────────────────────────────────────────────────────────────

import { Response, NextFunction } from 'express';
import { AppError }               from '../middleware/errorHandler';
import { env }                    from '../config/env';
import { AutomatizacionModel }    from '../models/Automatizacion';
import {
  isGoogleConfigured,
  isTwilioConfigured,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  crearEventoCalendar,
  enviarWhatsApp,
  enviarSMS,
  verificarNumeroTwilio,
}                                 from '../services/automatizacionesService';
import type { AuthRequest }       from '../types';
import type {
  ConfigInput,
  CrearEventoInput,
  EnviarWhatsAppInput,
  EnviarSMSInput,
  ConectarWhatsAppInput,
  ConectarSMSInput,
}                                 from '../types/automatizaciones';

// ── GET /api/automatizaciones ─────────────────────────────────────────────────
// Devuelve la config de toggles + estado de cada conexión.

export async function getEstado(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const config = AutomatizacionModel.getConfig(userId);

    const gcal = AutomatizacionModel.getConexion(userId, 'google_calendar');
    const wa   = AutomatizacionModel.getConexion(userId, 'whatsapp');
    const sms  = AutomatizacionModel.getConexion(userId, 'sms');

    res.status(200).json({
      config,
      conexiones: {
        google_calendar: {
          estado:     gcal?.estado     ?? 'desconectado',
          metadata:   gcal?.metadata   ?? {},
          modoDemo:   !isGoogleConfigured(),
        },
        whatsapp: {
          estado:     wa?.estado       ?? 'desconectado',
          metadata:   wa?.metadata     ?? {},
          modoDemo:   !isTwilioConfigured(),
        },
        sms: {
          estado:     sms?.estado      ?? 'desconectado',
          metadata:   sms?.metadata    ?? {},
          modoDemo:   !isTwilioConfigured(),
        },
      },
    });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── PUT /api/automatizaciones/config ─────────────────────────────────────────

export async function updateConfig(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const config = AutomatizacionModel.updateConfig(userId, req.body as ConfigInput);
    res.status(200).json({ message: 'Configuración actualizada.', config });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/automatizaciones/logs ────────────────────────────────────────────

export async function getLogs(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const logs  = AutomatizacionModel.getLogs(req.user!.userId, limit);
    res.status(200).json({ logs, total: logs.length });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/conectar-google ────────────────────────────────
// Si Google está configurado: retorna la authUrl para redirigir al usuario.
// Si no (modo demo): conecta directamente y retorna CONECTADO.

export async function conectarGoogle(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;

    if (!isGoogleConfigured()) {
      // Modo demo: marcar como conectado sin OAuth real
      AutomatizacionModel.setConexion(userId, 'google_calendar', {
        accessToken: 'DEMO_TOKEN',
        metadata:    { modoDemo: 'true', calendarId: 'primary' },
      });
      AutomatizacionModel.addLog(userId, 'google_calendar', 'conexion', 'Sistema', 'simulado',
        'Modo demo — credenciales GOOGLE_CLIENT_ID no configuradas');

      res.status(200).json({
        estado:   'conectado',
        modoDemo: true,
        message:  'Conectado en modo demo. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env para activar la integración real.',
      });
      return;
    }

    // OAuth real: devolvemos la URL y el frontend redirige
    const authUrl = getGoogleAuthUrl(userId);
    res.status(200).json({ authUrl, modoDemo: false });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/automatizaciones/google/callback ─────────────────────────────────
// Recibe el código de OAuth de Google, intercambia por tokens, guarda y redirige.

export async function googleCallback(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code   = String(req.query.code  ?? '').trim();
    const state  = String(req.query.state ?? '').trim(); // userId
    const userId = state || req.user?.userId;

    if (!code)   throw new AppError(400, 'Código OAuth no recibido.');
    if (!userId) throw new AppError(400, 'State inválido — userId no encontrado.');

    const tokens = await exchangeGoogleCode(code);
    if (tokens.error) {
      throw new AppError(400, tokens.error_description ?? tokens.error);
    }

    const expiry = new Date(Date.now() + tokens.expires_in * 1000);
    AutomatizacionModel.setConexion(userId, 'google_calendar', {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry:  expiry,
      metadata:     { calendarId: 'primary', modoDemo: 'false' },
    });

    AutomatizacionModel.addLog(userId, 'google_calendar', 'conexion', 'Sistema', 'enviado',
      'Google Calendar conectado correctamente');

    // Redirigir al frontend
    const frontendUrl = `${env.CLIENT_URL}/dashboard/automatizaciones?connected=google`;
    res.redirect(frontendUrl);
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/desconectar-google ────────────────────────────

export async function desconectarGoogle(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    AutomatizacionModel.desconectar(req.user!.userId, 'google_calendar');
    res.status(200).json({ estado: 'desconectado', message: 'Google Calendar desconectado.' });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/conectar-whatsapp ─────────────────────────────
// El médico ingresa su número de WhatsApp Business.
// La plataforma usa las credenciales Twilio del .env para enviar.

export async function conectarWhatsApp(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { phoneNumber } = req.body as ConectarWhatsAppInput;

    if (!phoneNumber) throw new AppError(400, 'El número de WhatsApp es requerido.');

    const valido = await verificarNumeroTwilio(phoneNumber);
    if (!valido) throw new AppError(400, 'No se pudieron verificar las credenciales de Twilio. Revisa TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.');

    AutomatizacionModel.setConexion(userId, 'whatsapp', {
      metadata: {
        phoneNumber,
        modoDemo: String(!isTwilioConfigured()),
      },
    });
    AutomatizacionModel.addLog(userId, 'whatsapp', 'conexion', 'Sistema', 'enviado',
      `WhatsApp Business conectado: ${phoneNumber}${!isTwilioConfigured() ? ' (modo demo)' : ''}`);

    res.status(200).json({
      estado:      'conectado',
      phoneNumber,
      modoDemo:    !isTwilioConfigured(),
      message:     `WhatsApp Business conectado${!isTwilioConfigured() ? ' en modo demo' : ''}.`,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/desconectar-whatsapp ──────────────────────────

export async function desconectarWhatsApp(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    AutomatizacionModel.desconectar(req.user!.userId, 'whatsapp');
    res.status(200).json({ estado: 'desconectado', message: 'WhatsApp desconectado.' });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/conectar-sms ──────────────────────────────────

export async function conectarSMS(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { phoneNumber } = req.body as ConectarSMSInput;

    if (!phoneNumber) throw new AppError(400, 'El número SMS es requerido.');

    AutomatizacionModel.setConexion(userId, 'sms', {
      metadata: { phoneNumber, modoDemo: String(!isTwilioConfigured()) },
    });
    AutomatizacionModel.addLog(userId, 'sms', 'conexion', 'Sistema', 'enviado',
      `SMS conectado: ${phoneNumber}${!isTwilioConfigured() ? ' (modo demo)' : ''}`);

    res.status(200).json({
      estado:      'conectado',
      phoneNumber,
      modoDemo:    !isTwilioConfigured(),
      message:     `SMS conectado${!isTwilioConfigured() ? ' en modo demo' : ''}.`,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/desconectar-sms ───────────────────────────────

export async function desconectarSMS(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    AutomatizacionModel.desconectar(req.user!.userId, 'sms');
    res.status(200).json({ estado: 'desconectado', message: 'SMS desconectado.' });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/crear-evento ──────────────────────────────────

export async function crearEvento(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const input  = req.body as CrearEventoInput;

    // Verificar conexión Google Calendar
    const conn = AutomatizacionModel.getConexion(userId, 'google_calendar');
    if (!conn || conn.estado !== 'conectado') {
      throw new AppError(409, 'Google Calendar no está conectado. Ve a Automatizaciones para conectarlo.');
    }

    const eventId = await crearEventoCalendar(
      conn.accessToken ?? 'DEMO_TOKEN',
      input,
    );

    AutomatizacionModel.addLog(
      userId, 'google_calendar', 'crear_evento',
      input.pacienteNombre ?? 'Paciente',
      conn.metadata['modoDemo'] === 'true' ? 'simulado' : 'enviado',
      `Evento creado: ${eventId} — ${input.fechaCita}`,
    );

    res.status(201).json({
      message:  'Evento creado en Google Calendar.',
      eventId,
      simulado: conn.metadata['modoDemo'] === 'true',
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/enviar-whatsapp ───────────────────────────────

export async function enviarWhatsAppCtrl(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const input  = req.body as EnviarWhatsAppInput;

    const conn = AutomatizacionModel.getConexion(userId, 'whatsapp');
    if (!conn || conn.estado !== 'conectado') {
      throw new AppError(409, 'WhatsApp no está conectado. Ve a Automatizaciones para conectarlo.');
    }

    const result = await enviarWhatsApp(input);

    AutomatizacionModel.addLog(
      userId, 'whatsapp', input.tipoMensaje,
      input.datos?.nombre ?? `Paciente ${input.pacienteId}`,
      result.simulado ? 'simulado' : 'enviado',
      `SID: ${result.sid} → ${input.telefono}`,
    );

    res.status(200).json({
      message:  'Mensaje WhatsApp enviado.',
      sid:      result.sid,
      simulado: result.simulado,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/automatizaciones/enviar-sms ────────────────────────────────────

export async function enviarSMSCtrl(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const input  = req.body as EnviarSMSInput;

    const conn = AutomatizacionModel.getConexion(userId, 'sms');
    if (!conn || conn.estado !== 'conectado') {
      throw new AppError(409, 'SMS no está configurado. Ve a Automatizaciones para activarlo.');
    }

    const result = await enviarSMS(input);

    AutomatizacionModel.addLog(
      userId, 'sms', input.tipoMensaje,
      input.datos?.nombre ?? `Paciente ${input.pacienteId}`,
      result.simulado ? 'simulado' : 'enviado',
      `SID: ${result.sid} → ${input.telefono}`,
    );

    res.status(200).json({
      message:  'SMS enviado.',
      sid:      result.sid,
      simulado: result.simulado,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}
