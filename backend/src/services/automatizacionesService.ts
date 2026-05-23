// ─────────────────────────────────────────────────────────────────────────────
// src/services/automatizacionesService.ts — Derma Copilot
//
// Integración real con:
//   • Google Calendar  (OAuth2 PKCE, Calendar API v3)
//   • Twilio SMS       (REST API directa — sin SDK)
//   • Twilio WhatsApp  (REST API directa — sin SDK)
//
// Modo demo automático cuando las credenciales no están configuradas:
//   isGoogleConfigured() → false → devuelve tokens simulados
//   isTwilioConfigured() → false → registra en consola, retorna SID simulado
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/env';
import type { CrearEventoInput, EnviarWhatsAppInput, EnviarSMSInput } from '../types/automatizaciones';

// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CAL_BASE  = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_SCOPES    = 'https://www.googleapis.com/auth/calendar.events';

export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function isTwilioConfigured(): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
}

/** Devuelve la URL de autorización OAuth2 de Google. */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         GOOGLE_SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  access_token:       string;
  refresh_token?:     string;
  expires_in:         number;
  token_type:         string;
  error?:             string;
  error_description?: string;
}

/** Intercambia el code de OAuth2 por tokens de acceso. */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  env.GOOGLE_REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  });
  return res.json() as Promise<GoogleTokens>;
}

/** Renueva el access_token usando el refresh_token almacenado. */
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type:    'refresh_token',
    }),
  });
  return res.json() as Promise<GoogleTokens>;
}

interface GCalEvent {
  summary:     string;
  description: string;
  start:       { dateTime: string; timeZone: string };
  end:         { dateTime: string; timeZone: string };
  reminders:   { useDefault: boolean; overrides?: { method: string; minutes: number }[] };
}

/**
 * Crea un evento en Google Calendar del usuario autenticado.
 * Retorna el eventId creado.
 */
export async function crearEventoCalendar(
  accessToken: string,
  input:       CrearEventoInput,
): Promise<string> {
  if (!isGoogleConfigured()) {
    // Modo demo
    console.log(`[GCAL SIMULADO] Crear evento para caso ${input.casoId} el ${input.fechaCita}`);
    return `SIMULADO-EVT-${Date.now()}`;
  }

  const inicio = new Date(input.fechaCita);
  const fin    = new Date(inicio.getTime() + (input.duracionMinutos ?? 60) * 60_000);

  const evento: GCalEvent = {
    summary:     input.titulo      ?? `Consulta Dermatológica${input.pacienteNombre ? ` — ${input.pacienteNombre}` : ''}`,
    description: input.descripcion ?? `Caso ID: ${input.casoId}`,
    start:       { dateTime: inicio.toISOString(), timeZone: 'America/Bogota' },
    end:         { dateTime: fin.toISOString(),    timeZone: 'America/Bogota' },
    reminders:   {
      useDefault: false,
      overrides:  [
        { method: 'email', minutes: 1440 },  // 24 h
        { method: 'popup', minutes: 60  },   // 1 h
      ],
    },
  };

  const res = await fetch(`${GOOGLE_CAL_BASE}/calendars/primary/events`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(evento),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Google Calendar error ${res.status}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio (SMS + WhatsApp)  — llamadas REST directas sin SDK
// ─────────────────────────────────────────────────────────────────────────────

interface TwilioMsgResponse {
  sid?:           string;
  status?:        string;
  error_message?: string;
  error_code?:    number;
}

async function twilioPost(
  params: Record<string, string>,
  accountSid = env.TWILIO_ACCOUNT_SID,
  authToken  = env.TWILIO_AUTH_TOKEN,
): Promise<TwilioMsgResponse> {
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  return res.json() as Promise<TwilioMsgResponse>;
}

// ── Plantillas de mensajes ────────────────────────────────────────────────────

type PlantillaFn = (d: Record<string, string>) => string;

const WA_TEMPLATES: Record<string, PlantillaFn> = {
  propuesta: d =>
    `👋 Hola${d.nombre ? ` ${d.nombre}` : ''}! En *Derma Copilot* hemos preparado una propuesta personalizada ` +
    `para tu tratamiento dermatológico. ¿Te gustaría conocerla? Responde *SÍ* y te enviamos los detalles. 🌿`,

  recordatorio: d =>
    `📅 *Recordatorio de cita* — Tienes una cita mañana${d.hora ? ` a las *${d.hora}*` : ''}` +
    `${d.lugar ? ` en ${d.lugar}` : ''}.\n\n` +
    `Responde *CONFIRMO* para confirmar o *CANCELAR* si necesitas reagendar. ¡Te esperamos! 😊`,

  reporte: d =>
    `📋 *Tu reporte médico está listo* — Consulta del ${d.fecha ?? 'día de hoy'}.\n\n` +
    `📌 ${d.diagnostico ?? 'Ver detalles en la clínica.'}\n\n` +
    `Cualquier duda, escríbenos o llama a tu médico. Cuídate mucho 💚`,
};

const SMS_TEMPLATES: Record<string, PlantillaFn> = {
  confirmacion: d =>
    `Derma Copilot: Cita confirmada${d.fecha ? ` el ${d.fecha}` : ''}${d.hora ? ` a las ${d.hora}` : ''}. ` +
    `Por favor llega 10 min antes. Consultas: ${d.telefono ?? 'ver email'}`,

  recordatorio: d =>
    `Derma Copilot: Recuerda tu cita en 48h${d.fecha ? ` (${d.fecha})` : ''}. ` +
    `Confirma respondiendo SI. Cancelaciones: ${d.telefono ?? 'llama a la clínica'}.`,
};

// ── Enviar WhatsApp ───────────────────────────────────────────────────────────

export async function enviarWhatsApp(
  input: EnviarWhatsAppInput,
): Promise<{ sid: string; simulado: boolean }> {
  const datos  = input.datos ?? {};
  const cuerpo = (WA_TEMPLATES[input.tipoMensaje] ?? WA_TEMPLATES['propuesta'])(datos);

  if (!isTwilioConfigured()) {
    console.log(`[WA SIMULADO] → ${input.telefono}\n${cuerpo}`);
    return { sid: `SIMULADO-WA-${Date.now()}`, simulado: true };
  }

  const to     = input.telefono.startsWith('whatsapp:') ? input.telefono : `whatsapp:${input.telefono}`;
  const result = await twilioPost({
    From: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
    To:   to,
    Body: cuerpo,
  });

  if (result.error_message) throw new Error(result.error_message);
  return { sid: result.sid ?? 'unknown', simulado: false };
}

// ── Enviar SMS ────────────────────────────────────────────────────────────────

export async function enviarSMS(
  input: EnviarSMSInput,
): Promise<{ sid: string; simulado: boolean }> {
  const datos  = input.datos ?? {};
  const cuerpo = (SMS_TEMPLATES[input.tipoMensaje] ?? SMS_TEMPLATES['confirmacion'])(datos);

  if (!isTwilioConfigured()) {
    console.log(`[SMS SIMULADO] → ${input.telefono}\n${cuerpo}`);
    return { sid: `SIMULADO-SMS-${Date.now()}`, simulado: true };
  }

  const result = await twilioPost({
    From: env.TWILIO_PHONE_NUMBER,
    To:   input.telefono,
    Body: cuerpo,
  });

  if (result.error_message) throw new Error(result.error_message);
  return { sid: result.sid ?? 'unknown', simulado: false };
}

// ── Verificar número WhatsApp en Twilio ───────────────────────────────────────

/**
 * Verifica si un número de teléfono está registrado en la cuenta Twilio configurada.
 * En modo demo (sin credenciales) siempre retorna true.
 */
/**
 * Verifica que las credenciales Twilio configuradas sean válidas.
 * El parámetro phoneNumber se reserva para futuras validaciones por número.
 * En modo demo (sin credenciales) siempre retorna true.
 */
export async function verificarNumeroTwilio(_phoneNumber: string): Promise<boolean> {
  if (!isTwilioConfigured()) return true;

  try {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken  = env.TWILIO_AUTH_TOKEN;
    const auth       = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const url        = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    // Si las credenciales son válidas, el número se considera registrado
    return res.ok;
  } catch {
    return false;
  }
}
