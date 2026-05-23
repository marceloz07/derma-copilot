// ─────────────────────────────────────────────────────────────────────────────
// src/models/Caso.ts — Derma Copilot
// Modelo en memoria para casos dermatológicos.
// TODO: reemplazar con Prisma cuando la BD esté activa.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type { AnalisisDermatologico, Caso } from '../types/casos';

const casosDb = new Map<string, Caso>();

export const CasoModel = {
  async create(data: {
    userId:       string;
    sintomas:     string;
    analisis:     AnalisisDermatologico;
    imagenBase64?: string;
    mimeType?:    string;
  }): Promise<Caso> {
    const caso: Caso = {
      id:           randomUUID(),
      userId:       data.userId,
      sintomas:     data.sintomas,
      analisis:     data.analisis,
      imagenBase64: data.imagenBase64,
      mimeType:     data.mimeType,
      createdAt:    new Date(),
    };
    casosDb.set(caso.id, caso);
    return caso;
  },

  async findById(id: string): Promise<Caso | null> {
    return casosDb.get(id) ?? null;
  },

  async findByUserId(userId: string): Promise<Caso[]> {
    return [...casosDb.values()]
      .filter(c => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  /** Devuelve el caso sin la imagen para respuestas de listado. */
  sanitize(caso: Caso): Omit<Caso, 'imagenBase64'> {
    const { imagenBase64: _img, ...safe } = caso;
    return safe;
  },
};
