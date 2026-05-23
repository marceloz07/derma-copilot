// ─────────────────────────────────────────────────────────────────────────────
// lib/reportes.ts — Derma Copilot Frontend
// Cliente para el módulo de reportes clínicos.
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken } from './auth';
import { ApiError }       from './api';
import type {
  DatosEditables,
  EnviarReporteData,
  GenerarReporteResponse,
  ActualizarReporteResponse,
  ReporteListItem,
} from '../types/reportes';

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

function authHeadersRaw(): Record<string, string> {
  const token = getAccessToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// ── Listar reportes ────────────────────────────────────────────────────────────

export async function listarReportes(): Promise<ReporteListItem[]> {
  const res  = await fetch(`${BASE}/api/reportes`, { headers: authHeaders() });
  const json = await res.json().catch(() => ({})) as { reportes?: ReporteListItem[]; error?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? res.statusText);
  return json.reportes ?? [];
}

// ── Generar reporte ────────────────────────────────────────────────────────────

export async function generarReporte(
  casoId:         string,
  consultaId?:    string,
  datosEditables?: Partial<DatosEditables>,
): Promise<GenerarReporteResponse> {
  const res = await fetch(`${BASE}/api/reportes/generar`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({
      casoId,
      ...(consultaId        ? { consultaId }        : {}),
      ...(datosEditables    ? { datosEditables }    : {}),
    }),
  });

  const json = await res.json() as GenerarReporteResponse & { error?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? res.statusText);
  return json;
}

// ── Actualizar (regenerar con nuevos datos editables) ─────────────────────────

export async function actualizarReporte(
  reporteId:     string,
  datosEditables: DatosEditables,
): Promise<ActualizarReporteResponse> {
  const res = await fetch(`${BASE}/api/reportes/${reporteId}`, {
    method:  'PUT',
    headers: authHeaders(),
    body:    JSON.stringify(datosEditables),
  });

  const json = await res.json() as ActualizarReporteResponse & { error?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? res.statusText);
  return json;
}

// ── Descargar PDF ─────────────────────────────────────────────────────────────

export async function descargarPdf(
  reporteId: string,
  filename?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/reportes/${reporteId}/pdf`, {
    headers: authHeadersRaw(),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, json.error ?? 'Error al descargar PDF.');
  }

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename ?? `reporte-${reporteId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Enviar por email ──────────────────────────────────────────────────────────

export async function enviarReporte(
  reporteId: string,
  data:      EnviarReporteData,
): Promise<void> {
  const res = await fetch(`${BASE}/api/reportes/${reporteId}/enviar`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? 'Error al enviar reporte.');
}
