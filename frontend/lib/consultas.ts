// ─────────────────────────────────────────────────────────────────────────────
// lib/consultas.ts — Derma Copilot Frontend
// Cliente para el módulo de chat clínico.
// Implementa lectura de SSE streaming para el chat principal.
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken } from './auth';
import { ApiError }       from './api';
import type {
  EnviarMensajeData,
  EventoSSE,
  SesionChat,
} from '../types/consultas';

const BASE = typeof window !== 'undefined'
  ? ''
  : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001');

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return {
    'Content-Type':  'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// ── enviarMensajeStream — consume SSE del backend ─────────────────────────────

export async function enviarMensajeStream(
  data:     EnviarMensajeData,
  onDelta:  (text: string) => void,
  onDone:   (ev: Extract<EventoSSE, { type: 'done' }>) => void,
  onError?: (msg: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/api/consultas/mensaje`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(data),
  });

  if (!res.ok) {
    const json    = await res.json().catch(() => ({})) as Record<string, unknown>;
    const message = typeof json['error'] === 'string' ? json['error'] : res.statusText;
    throw new ApiError(res.status, message);
  }

  const reader  = res.body?.getReader();
  if (!reader) throw new Error('Stream no disponible.');

  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Los eventos SSE están separados por \n\n
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';   // el último fragmento puede estar incompleto

    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data: ')) continue;

        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        try {
          const evento = JSON.parse(raw) as EventoSSE;

          if (evento.type === 'delta') {
            onDelta(evento.text);
          } else if (evento.type === 'done') {
            onDone(evento);
          } else if (evento.type === 'error') {
            onError?.(evento.error);
          }
        } catch {
          // línea de comentario SSE (keepalive) u otro formato — ignorar
        }
      }
    }
  }
}

// ── Sugerencias (polling rápido, debounced en el componente) ──────────────────

export async function obtenerSugerencias(
  texto:        string,
  sintomas?:    string,
): Promise<string[]> {
  if (texto.trim().length < 5) return [];

  try {
    const res = await fetch(`${BASE}/api/consultas/sugerencias`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({
        texto,
        ...(sintomas ? { contextoCaso: { sintomas } } : {}),
      }),
    });
    if (!res.ok) return [];
    const json = await res.json() as { sugerencias: string[] };
    return json.sugerencias ?? [];
  } catch {
    return [];
  }
}

// ── Historial de sesión ────────────────────────────────────────────────────────

export async function obtenerHistorial(casoId: string): Promise<SesionChat | null> {
  const res  = await fetch(`${BASE}/api/consultas/${casoId}`, { headers: authHeaders() });
  const json = await res.json() as { sesion: SesionChat | null };
  return json.sesion;
}

// ── Guardar consulta ───────────────────────────────────────────────────────────

export async function guardarConsulta(casoId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/consultas/${casoId}/guardar`, {
    method:  'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(res.status, (json['error'] as string) ?? 'Error al guardar.');
  }
}

// ── Generar reporte ────────────────────────────────────────────────────────────

export async function generarReporte(casoId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/consultas/${casoId}/reporte`, {
    method:  'POST',
    headers: authHeaders(),
  });
  const json = await res.json() as { reporte?: string; error?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? 'Error al generar reporte.');
  return json.reporte ?? '';
}
