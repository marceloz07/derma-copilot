// ─────────────────────────────────────────────────────────────────────────────
// src/types/pacientes.ts — Derma Copilot
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoPaciente = 'activo' | 'inactivo';
export type GeneroPaciente = 'Masculino' | 'Femenino' | 'Otro' | 'No especificado';

export interface Paciente {
  id:               string;
  userId:           string;   // médico que lo registró
  nombre:           string;
  apellido?:        string;
  email?:           string;
  telefono?:        string;
  fechaNacimiento?: string;   // YYYY-MM-DD
  genero?:          GeneroPaciente;
  estado:           EstadoPaciente;
  notas?:           string;
  createdAt:        Date;
  updatedAt:        Date;
}

export interface CrearPacienteInput {
  nombre:           string;
  apellido?:        string;
  email?:           string;
  telefono?:        string;
  fechaNacimiento?: string;
  genero?:          GeneroPaciente;
  notas?:           string;
}

export interface ActualizarPacienteInput extends Partial<CrearPacienteInput> {
  estado?: EstadoPaciente;
}
