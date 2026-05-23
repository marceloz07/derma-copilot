// ─────────────────────────────────────────────────────────────────────────────
// src/models/Paciente.ts — Derma Copilot
// Modelo en memoria.  TODO: reemplazar con Prisma → tabla pacientes
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type {
  Paciente,
  CrearPacienteInput,
  ActualizarPacienteInput,
} from '../types/pacientes';

const pacientesDb = new Map<string, Paciente>();

// ── Seed de demostración ─────────────────────────────────────────────────────
// Se poblará con userId "1" al primer acceso, útil en modo desarrollo.

let seeded = false;

function seedDemo(userId: string) {
  if (seeded) return;
  seeded = true;

  const demos: Omit<Paciente, 'id'>[] = [
    {
      userId, nombre: 'Ana', apellido: 'García López',
      email: 'ana.garcia@email.com', telefono: '+52 55 1234 5678',
      fechaNacimiento: '1992-04-15', genero: 'Femenino',
      estado: 'activo', notas: 'Antecedentes de dermatitis atópica.',
      createdAt: new Date('2026-05-01'), updatedAt: new Date('2026-05-01'),
    },
    {
      userId, nombre: 'Carlos', apellido: 'Mendoza',
      email: 'c.mendoza@email.com', telefono: '+52 33 9876 5432',
      fechaNacimiento: '1978-11-20', genero: 'Masculino',
      estado: 'activo', notas: 'Historia de psoriasis familiar.',
      createdAt: new Date('2026-05-03'), updatedAt: new Date('2026-05-03'),
    },
    {
      userId, nombre: 'Sofía', apellido: 'Reyes Torres',
      email: 'sofia.reyes@email.com', telefono: '+52 81 5555 0101',
      fechaNacimiento: '2001-07-30', genero: 'Femenino',
      estado: 'activo',
      createdAt: new Date('2026-05-08'), updatedAt: new Date('2026-05-08'),
    },
    {
      userId, nombre: 'Roberto', apellido: 'Ibáñez',
      email: 'r.ibanez@email.com', telefono: '+52 55 2222 3333',
      fechaNacimiento: '1965-02-10', genero: 'Masculino',
      estado: 'inactivo', notas: 'No ha regresado a consulta desde 2025.',
      createdAt: new Date('2026-04-12'), updatedAt: new Date('2026-04-12'),
    },
    {
      userId, nombre: 'Lucía', apellido: 'Vargas',
      email: 'lucia.v@email.com', telefono: '',
      fechaNacimiento: '1998-09-05', genero: 'Femenino',
      estado: 'activo',
      createdAt: new Date('2026-05-15'), updatedAt: new Date('2026-05-15'),
    },
  ];

  for (const d of demos) {
    const p: Paciente = { ...d, id: randomUUID() };
    pacientesDb.set(p.id, p);
  }
}

// ── Modelo ────────────────────────────────────────────────────────────────────

export const PacienteModel = {

  async create(userId: string, data: CrearPacienteInput): Promise<Paciente> {
    const paciente: Paciente = {
      id:               randomUUID(),
      userId,
      nombre:           data.nombre,
      apellido:         data.apellido,
      email:            data.email,
      telefono:         data.telefono,
      fechaNacimiento:  data.fechaNacimiento,
      genero:           data.genero,
      estado:           'activo',
      notas:            data.notas,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    };
    pacientesDb.set(paciente.id, paciente);
    return paciente;
  },

  async findById(id: string): Promise<Paciente | null> {
    return pacientesDb.get(id) ?? null;
  },

  async findByUserId(userId: string): Promise<Paciente[]> {
    seedDemo(userId);   // seed on first real access
    return [...pacientesDb.values()]
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async update(id: string, data: ActualizarPacienteInput): Promise<Paciente | null> {
    const p = pacientesDb.get(id);
    if (!p) return null;
    const updated: Paciente = {
      ...p,
      ...data,
      updatedAt: new Date(),
    };
    pacientesDb.set(id, updated);
    return updated;
  },
};
