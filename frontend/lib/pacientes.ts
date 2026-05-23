// ─────────────────────────────────────────────────────────────────────────────
// lib/pacientes.ts — Derma Copilot Frontend
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken } from './auth';
import { ApiError }       from './api';
import type {
  Paciente,
  CrearPacienteData,
  ActualizarPacienteData,
} from '../types/pacientes';

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
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof json['error'] === 'string' ? json['error'] : res.statusText;
    throw new ApiError(res.status, msg);
  }
  return json as T;
}

export const pacientesApi = {
  listar: () =>
    fetch(`${BASE}/api/pacientes`, { headers: headers() })
      .then(r => handleRes<{ pacientes: Paciente[] }>(r)),

  crear: (data: CrearPacienteData) =>
    fetch(`${BASE}/api/pacientes`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(r => handleRes<{ message: string; paciente: Paciente }>(r)),

  obtener: (id: string) =>
    fetch(`${BASE}/api/pacientes/${id}`, { headers: headers() })
      .then(r => handleRes<{ paciente: Paciente }>(r)),

  actualizar: (id: string, data: ActualizarPacienteData) =>
    fetch(`${BASE}/api/pacientes/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    }).then(r => handleRes<{ message: string; paciente: Paciente }>(r)),
};
