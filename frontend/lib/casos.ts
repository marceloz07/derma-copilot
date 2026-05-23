// ─────────────────────────────────────────────────────────────────────────────
// lib/casos.ts — Derma Copilot Frontend
// Cliente API para el módulo de análisis de casos.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnalizarCasoData, AnalizarCasoResponse } from '../types/casos';
import { getAccessToken } from './auth';
import { ApiError } from './api';

const BASE_URL =
  typeof window !== 'undefined'
    ? ''
    : (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001');

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      typeof data['error']   === 'string' ? data['error']   :
      typeof data['message'] === 'string' ? data['message'] :
      res.statusText;
    const fields = Array.isArray(data['fields'])
      ? (data['fields'] as Array<{ field: string; message: string }>)
      : undefined;
    throw new ApiError(res.status, message, fields);
  }

  return data as T;
}

// ── Convertir File → base64 ───────────────────────────────────────────────────

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const result = reader.result as string;
      // Quitar el prefijo "data:image/...;base64,"
      const base64 = result.split(',')[1];
      if (!base64) reject(new Error('No se pudo convertir la imagen.'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Error leyendo la imagen.'));
    reader.readAsDataURL(file);
  });
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const casosApi = {
  analizar: (data: AnalizarCasoData) =>
    request<AnalizarCasoResponse>('/api/casos/analizar', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),
};
