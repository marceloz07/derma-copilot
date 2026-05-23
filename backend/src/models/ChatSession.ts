// ─────────────────────────────────────────────────────────────────────────────
// src/models/ChatSession.ts — Derma Copilot
// Modelo en memoria para sesiones de chat clínico.
// Una sola sesión por caso (sobreescribible).
// TODO: reemplazar con Prisma → tabla sesiones_chat + mensajes_chat
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type { MensajeChat, SesionChat } from '../types/consultas';

// Map<casoId, SesionChat>
const sesionesDb = new Map<string, SesionChat>();

export const ChatSessionModel = {
  // ── Obtener o crear ────────────────────────────────────────────────────────
  async getOrCreate(casoId: string, userId: string): Promise<SesionChat> {
    const existing = sesionesDb.get(casoId);
    if (existing) return existing;

    const sesion: SesionChat = {
      id:          randomUUID(),
      casoId,
      userId,
      mensajes:    [],
      totalTokens: 0,
      guardada:    false,
      createdAt:   new Date(),
      updatedAt:   new Date(),
    };
    sesionesDb.set(casoId, sesion);
    return sesion;
  },

  // ── Añadir mensaje ─────────────────────────────────────────────────────────
  async addMessage(
    casoId:  string,
    userId:  string,
    mensaje: Omit<MensajeChat, 'id' | 'timestamp'>,
  ): Promise<SesionChat> {
    const sesion = await this.getOrCreate(casoId, userId);

    const msg: MensajeChat = {
      ...mensaje,
      id:        randomUUID(),
      timestamp: new Date(),
    };

    sesion.mensajes.push(msg);
    sesion.totalTokens += mensaje.tokensUsados ?? 0;
    sesion.updatedAt = new Date();
    return sesion;
  },

  // ── Buscar por caso ────────────────────────────────────────────────────────
  async findByCasoId(casoId: string): Promise<SesionChat | null> {
    return sesionesDb.get(casoId) ?? null;
  },

  // ── Guardar (marcar como guardada) ─────────────────────────────────────────
  async guardar(casoId: string): Promise<SesionChat> {
    const sesion = sesionesDb.get(casoId);
    if (!sesion) throw new Error('Sesión de chat no encontrada.');
    sesion.guardada  = true;
    sesion.updatedAt = new Date();
    return sesion;
  },

  // ── Historial en formato Anthropic messages ────────────────────────────────
  toAnthropicMessages(
    sesion: SesionChat,
    limit = 20,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return sesion.mensajes
      .slice(-limit)
      .map(m => ({ role: m.role, content: m.contenido }));
  },
};
