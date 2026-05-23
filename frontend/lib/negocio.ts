// ─────────────────────────────────────────────────────────────────────────────
// lib/negocio.ts — Derma Copilot Frontend
// Cliente HTTP para el módulo Asesor Comercial (Benchmarking + Paquetes).
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken } from './auth';
import { ApiError }       from './api';
import type {
  ItemCatalogo,
  ResultadoBenchmarking,
  PrecioRegistrado,
  RegistrarPrecioInput,
  ResumenBenchmarking,
  SugerenciaPaquete,
  ScriptVenta,
  PaquetePersonalizado,
  CrearPaqueteInput,
  AnalyticsPaquete,
  ResumenAnalytics,
  CategoriaScript,
} from '../types/negocio';

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

// ── Catálogo (dropdowns) ──────────────────────────────────────────────────────

export async function getCatalogo(): Promise<{
  tratamientos: ItemCatalogo[];
  zonas:        ItemCatalogo[];
}> {
  const res = await fetch(`${BASE}/api/negocio/catalogo`, { headers: headers() });
  return handleRes<{ tratamientos: ItemCatalogo[]; zonas: ItemCatalogo[] }>(res);
}

// ── Benchmarking ──────────────────────────────────────────────────────────────

export async function getBenchmarking(
  tratamiento: string,
  zona:        string,
): Promise<ResultadoBenchmarking> {
  const params = new URLSearchParams({ tratamiento, zona });
  const res    = await fetch(`${BASE}/api/negocio/benchmarking?${params}`, { headers: headers() });
  const json   = await handleRes<{ resultado: ResultadoBenchmarking }>(res);
  return json.resultado;
}

// ── Precios registrados ───────────────────────────────────────────────────────

export async function listarPrecios(): Promise<PrecioRegistrado[]> {
  const res  = await fetch(`${BASE}/api/negocio/precios`, { headers: headers() });
  const json = await handleRes<{ precios: PrecioRegistrado[] }>(res);
  return json.precios;
}

export async function registrarPrecio(
  data: RegistrarPrecioInput,
): Promise<PrecioRegistrado> {
  const res  = await fetch(`${BASE}/api/negocio/precios`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  const json = await handleRes<{ precio: PrecioRegistrado }>(res);
  return json.precio;
}

// ── Sugerencias de paquetes ───────────────────────────────────────────────────

export async function getSugerencias(tratamiento: string): Promise<SugerenciaPaquete[]> {
  const params = new URLSearchParams({ tratamiento });
  const res    = await fetch(`${BASE}/api/negocio/sugerencias?${params}`, { headers: headers() });
  const json   = await handleRes<{ sugerencias: SugerenciaPaquete[] }>(res);
  return json.sugerencias;
}

// ── Scripts de venta ──────────────────────────────────────────────────────────

export async function getScripts(categoria?: CategoriaScript): Promise<ScriptVenta[]> {
  const params = categoria ? new URLSearchParams({ categoria }) : new URLSearchParams();
  const res    = await fetch(`${BASE}/api/negocio/scripts?${params}`, { headers: headers() });
  const json   = await handleRes<{ scripts: ScriptVenta[] }>(res);
  return json.scripts;
}

// ── Paquetes personalizados ───────────────────────────────────────────────────

export async function listarPaquetes(): Promise<PaquetePersonalizado[]> {
  const res  = await fetch(`${BASE}/api/negocio/paquetes`, { headers: headers() });
  const json = await handleRes<{ paquetes: PaquetePersonalizado[] }>(res);
  return json.paquetes;
}

export async function crearPaquete(
  data: CrearPaqueteInput,
): Promise<PaquetePersonalizado> {
  const res  = await fetch(`${BASE}/api/negocio/paquetes`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  const json = await handleRes<{ paquete: PaquetePersonalizado }>(res);
  return json.paquete;
}

export async function actualizarPaquete(
  id:   string,
  data: Partial<CrearPaqueteInput>,
): Promise<PaquetePersonalizado> {
  const res  = await fetch(`${BASE}/api/negocio/paquetes/${id}`, {
    method:  'PUT',
    headers: headers(),
    body:    JSON.stringify(data),
  });
  const json = await handleRes<{ paquete: PaquetePersonalizado }>(res);
  return json.paquete;
}

export async function registrarAceptacion(
  paqueteId:    string,
  aceptado:     boolean,
  pacienteRef?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/negocio/paquetes/${paqueteId}/aceptacion`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ aceptado, pacienteRef }),
  });
  await handleRes<unknown>(res);
}

// ── Analytics (paquetes + benchmarking) ──────────────────────────────────────

export async function getAnalytics(): Promise<{
  paquetes:            AnalyticsPaquete[];
  resumenPaquetes:     ResumenAnalytics;
  precios:             PrecioRegistrado[];
  resumenBenchmarking: ResumenBenchmarking;
}> {
  const res = await fetch(`${BASE}/api/negocio/analytics`, { headers: headers() });
  return handleRes<{
    paquetes:            AnalyticsPaquete[];
    resumenPaquetes:     ResumenAnalytics;
    precios:             PrecioRegistrado[];
    resumenBenchmarking: ResumenBenchmarking;
  }>(res);
}
