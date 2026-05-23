// ─────────────────────────────────────────────────────────────────────────────
// src/models/Negocio.ts — Derma Copilot
// Modelo en memoria para el módulo Asesor Comercial.
// TODO: reemplazar con Prisma → tablas paquetes_personalizados,
//       registro_aceptaciones, precios_registrados
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type {
  PaquetePersonalizado,
  CrearPaqueteInput,
  RegistroAceptacion,
  PrecioRegistrado,
  RegistrarPrecioInput,
  TipoPosicionamiento,
} from '../types/negocio';

const paquetesDb     = new Map<string, PaquetePersonalizado>();
const aceptacionesDb = new Map<string, RegistroAceptacion>();
const preciosDb      = new Map<string, PrecioRegistrado>();

export const NegocioModel = {

  // ── Paquetes ──────────────────────────────────────────────────────────────

  async createPaquete(
    data: CrearPaqueteInput & { userId: string },
  ): Promise<PaquetePersonalizado> {
    const p: PaquetePersonalizado = {
      id:              randomUUID(),
      userId:          data.userId,
      nombre:          data.nombre,
      tipo:            data.tipo,
      tratamiento:     data.tratamiento,
      sesiones:        data.sesiones,
      duracionMinutos: data.duracionMinutos,
      periodicidad:    data.periodicidad,
      precioFinal:     data.precioFinal,
      descripcion:     data.descripcion ?? '',
      activo:          true,
      createdAt:       new Date(),
      updatedAt:       new Date(),
    };
    paquetesDb.set(p.id, p);
    return p;
  },

  async findPaquetesByUser(userId: string): Promise<PaquetePersonalizado[]> {
    return [...paquetesDb.values()]
      .filter(p => p.userId === userId && p.activo)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async findPaqueteById(id: string): Promise<PaquetePersonalizado | null> {
    return paquetesDb.get(id) ?? null;
  },

  async updatePaquete(
    id:   string,
    data: Partial<Omit<PaquetePersonalizado, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<PaquetePersonalizado> {
    const p = paquetesDb.get(id);
    if (!p) throw new Error('Paquete no encontrado.');
    Object.assign(p, { ...data, updatedAt: new Date() });
    return p;
  },

  // ── Aceptaciones / rechazos ───────────────────────────────────────────────

  async registrarAceptacion(data: {
    userId:      string;
    paqueteId:   string;
    pacienteRef: string;
    aceptado:    boolean;
  }): Promise<RegistroAceptacion> {
    const a: RegistroAceptacion = {
      id:          randomUUID(),
      userId:      data.userId,
      paqueteId:   data.paqueteId,
      pacienteRef: data.pacienteRef,
      aceptado:    data.aceptado,
      createdAt:   new Date(),
    };
    aceptacionesDb.set(a.id, a);
    return a;
  },

  async findAceptacionesByUser(userId: string): Promise<RegistroAceptacion[]> {
    return [...aceptacionesDb.values()].filter(a => a.userId === userId);
  },

  // ── Precios registrados (benchmarking) ────────────────────────────────────

  async registrarPrecio(data: RegistrarPrecioInput & {
    userId:           string;
    tratamientoLabel: string;
    zonaLabel:        string;
    unidad:           string;
    benchmarkMin:     number;
    benchmarkProm:    number;
    benchmarkMax:     number;
    posicionamiento:  TipoPosicionamiento;
  }): Promise<PrecioRegistrado> {
    const pr: PrecioRegistrado = {
      id:               randomUUID(),
      userId:           data.userId,
      tratamiento:      data.tratamiento,
      tratamientoLabel: data.tratamientoLabel,
      zona:             data.zona,
      zonaLabel:        data.zonaLabel,
      precioFinal:      data.precioFinal,
      unidad:           data.unidad,
      posicionamiento:  data.posicionamiento,
      benchmarkMin:     data.benchmarkMin,
      benchmarkProm:    data.benchmarkProm,
      benchmarkMax:     data.benchmarkMax,
      diferencial:      data.precioFinal - data.benchmarkProm,
      notas:            data.notas ?? '',
      createdAt:        new Date(),
      updatedAt:        new Date(),
    };
    preciosDb.set(pr.id, pr);
    return pr;
  },

  async findPreciosByUser(userId: string): Promise<PrecioRegistrado[]> {
    return [...preciosDb.values()]
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
};
