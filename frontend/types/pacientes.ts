// ─────────────────────────────────────────────────────────────────────────────
// types/pacientes.ts — Derma Copilot Frontend
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoPaciente = 'activo' | 'inactivo';
export type GeneroPaciente = 'Masculino' | 'Femenino' | 'Otro' | 'No especificado';

export interface Paciente {
  id:               string;
  userId:           string;
  nombre:           string;
  apellido?:        string;
  email?:           string;
  telefono?:        string;
  fechaNacimiento?: string;
  genero?:          GeneroPaciente;
  estado:           EstadoPaciente;
  notas?:           string;
  createdAt:        string;
  updatedAt:        string;
}

export interface CrearPacienteData {
  nombre:           string;
  apellido?:        string;
  email?:           string;
  telefono?:        string;
  fechaNacimiento?: string;
  genero?:          GeneroPaciente;
  notas?:           string;
}

export interface ActualizarPacienteData extends Partial<CrearPacienteData> {
  estado?: EstadoPaciente;
}
