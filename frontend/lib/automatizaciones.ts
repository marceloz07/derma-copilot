// ─────────────────────────────────────────────────────────────────────────────
// lib/automatizaciones.ts — Derma Copilot Frontend
// Cliente HTTP para el módulo de Automatizaciones.
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken } from './auth';
import { ApiError }       from './api';
import type {
  EstadoAutomatizaciones,
  ConfigInput,
  LogAutomatizacion,
  CrearEventoInput,
  EnviarWhatsAppInput,
  EnviarSMSInput,
}                         from '../types/automatizaciones';

const BASE = typeof window !== 'undefined'
  ? ''
  : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001');

function headers(): Record<string, string> {
  const token = getAccessToken();
  return {
    'Content-Type':  'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function handleRes<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, (json as { error?: string }).error ?? res.statusText);
  return json;
}

// ── Estado global ─────────────────────────────────────────────────────────────

export async function getEstado(): Promise<EstadoAutomatizaciones> {
  const res = await fetch(`${BASE}/api/automatizaciones`, { headers: headers() });
  return handleRes<EstadoAutomatizaciones>(res);
}

// ── Config toggles ────────────────────────────────────────────────────────────

export async function updateConfig(data: ConfigInput): Promise<EstadoAutomatizaciones['config']> {
  const res  = await fetch(`${BASE}/api/automatizaciones/config`, {
    method:  'PUT',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  const json = await handleRes<{ config: EstadoAutomatizaciones['config'] }>(res);
  return json.config;
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export async function getLogs(limit = 50): Promise<LogAutomatizacion[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res    = await fetch(`${BASE}/api/automatizaciones/logs?${params}`, { headers: headers() });
  const json   = await handleRes<{ logs: LogAutomatizacion[] }>(res);
  return json.logs;
}

// ── Google Calendar ───────────────────────────────────────────────────────────

export async function conectarGoogle(): Promise<{ authUrl?: string; modoDemo: boolean; estado?: string; message?: string }> {
  const res = await fetch(`${BASE}/api/automatizaciones/conectar-google`, {
    method:  'POST',
    headers: headers(),
    body:    '{}',
  });
  return handleRes<{ authUrl?: string; modoDemo: boolean; estado?: string; message?: string }>(res);
}

export async function desconectarGoogle(): Promise<void> {
  const res = await fetch(`${BASE}/api/automatizaciones/desconectar-google`, {
    method:  'POST',
    headers: headers(),
    body:    '{}',
  });
  await handleRes<unknown>(res);
}

// ── WhatsApp Business ─────────────────────────────────────────────────────────

export async function conectarWhatsApp(phoneNumber: string): Promise<{ estado: string; modoDemo: boolean; message: string }> {
  const res = await fetch(`${BASE}/api/automatizaciones/conectar-whatsapp`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ phoneNumber }),
  });
  return handleRes<{ estado: string; modoDemo: boolean; message: string }>(res);
}

export async function desconectarWhatsApp(): Promise<void> {
  const res = await fetch(`${BASE}/api/automatizaciones/desconectar-whatsapp`, {
    method:  'POST',
    headers: headers(),
    body:    '{}',
  });
  await handleRes<unknown>(res);
}

// ── SMS ───────────────────────────────────────────────────────────────────────

export async function conectarSMS(phoneNumber: string): Promise<{ estado: string; modoDemo: boolean; message: string }> {
  const res = await fetch(`${BASE}/api/automatizaciones/conectar-sms`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ phoneNumber }),
  });
  return handleRes<{ estado: string; modoDemo: boolean; message: string }>(res);
}

export async function desconectarSMS(): Promise<void> {
  const res = await fetch(`${BASE}/api/automatizaciones/desconectar-sms`, {
    method:  'POST',
    headers: headers(),
    body:    '{}',
  });
  await handleRes<unknown>(res);
}

// ── Acciones ──────────────────────────────────────────────────────────────────

export async function crearEvento(data: CrearEventoInput): Promise<{ eventId: string; simulado: boolean }> {
  const res  = await fetch(`${BASE}/api/automatizaciones/crear-evento`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  return handleRes<{ eventId: string; simulado: boolean }>(res);
}

export async function enviarWhatsApp(data: EnviarWhatsAppInput): Promise<{ sid: string; simulado: boolean }> {
  const res  = await fetch(`${BASE}/api/automatizaciones/enviar-whatsapp`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  return handleRes<{ sid: string; simulado: boolean }>(res);
}

export async function enviarSMS(data: EnviarSMSInput): Promise<{ sid: string; simulado: boolean }> {
  const res  = await fetch(`${BASE}/api/automatizaciones/enviar-sms`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  return handleRes<{ sid: string; simulado: boolean }>(res);
}
