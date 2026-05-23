// ─────────────────────────────────────────────────────────────────────────────
// src/models/Reporte.ts — Derma Copilot
// Modelo en memoria para reportes clínicos.
// TODO: reemplazar con Prisma → tabla reportes
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type { Reporte, DatosEditables } from '../types/reportes';

// Almacén principal de reportes
const reportesDb = new Map<string, Reporte>();

// PDF buffers por separado (no serializable en JSON)
const pdfBuffers  = new Map<string, Buffer>();

export const ReporteModel = {

  async create(data: {
    casoId:         string;
    consultaId?:    string;
    userId:         string;
    datosEditables: DatosEditables;
    contenidoHtml:  string;
    pdfBuffer:      Buffer;
  }): Promise<Reporte> {
    const reporte: Reporte = {
      id:             randomUUID(),
      casoId:         data.casoId,
      consultaId:     data.consultaId,
      userId:         data.userId,
      datosEditables: data.datosEditables,
      contenidoHtml:  data.contenidoHtml,
      createdAt:      new Date(),
      updatedAt:      new Date(),
      enviado:        false,
    };
    reportesDb.set(reporte.id, reporte);
    pdfBuffers.set(reporte.id, data.pdfBuffer);
    return reporte;
  },

  async update(
    id:   string,
    data: Pick<Reporte, 'datosEditables' | 'contenidoHtml'> & { pdfBuffer: Buffer },
  ): Promise<Reporte> {
    const reporte = reportesDb.get(id);
    if (!reporte) throw new Error('Reporte no encontrado.');
    reporte.datosEditables = data.datosEditables;
    reporte.contenidoHtml  = data.contenidoHtml;
    reporte.updatedAt      = new Date();
    pdfBuffers.set(id, data.pdfBuffer);
    return reporte;
  },

  async marcarEnviado(id: string, email: string): Promise<void> {
    const reporte = reportesDb.get(id);
    if (!reporte) throw new Error('Reporte no encontrado.');
    reporte.enviado      = true;
    reporte.emailEnviado = email;
    reporte.updatedAt    = new Date();
  },

  async findById(id: string): Promise<Reporte | null> {
    return reportesDb.get(id) ?? null;
  },

  async findByCasoId(casoId: string): Promise<Reporte[]> {
    return [...reportesDb.values()]
      .filter(r => r.casoId === casoId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  /** Devuelve el reporte más reciente asociado a una consultaId (y userId opcional). */
  async findByConsultaId(consultaId: string, userId?: string): Promise<Reporte | null> {
    const results = [...reportesDb.values()]
      .filter(r => r.consultaId === consultaId && (!userId || r.userId === userId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results[0] ?? null;
  },

  async findByUserId(userId: string): Promise<Reporte[]> {
    return [...reportesDb.values()]
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getPdfBuffer(id: string): Buffer | null {
    return pdfBuffers.get(id) ?? null;
  },
};
