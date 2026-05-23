// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/consultas.controller.ts — Derma Copilot
//
// POST  /api/consultas/mensaje       →  Chat SSE streaming
// POST  /api/consultas/sugerencias   →  Autocompletados rápidos
// GET   /api/consultas/:casoId       →  Historial de sesión
// POST  /api/consultas/:casoId/guardar →  Marcar sesión como guardada
// POST  /api/consultas/:casoId/reporte →  Generar reporte clínico
// ─────────────────────────────────────────────────────────────────────────────

import type { Response, NextFunction } from 'express';
import { AppError }            from '../middleware/errorHandler';
import { ChatSessionModel }    from '../models/ChatSession';
import {
  procesarMensajeStream,
  obtenerSugerencias,
  generarReporte,
}                              from '../services/consultasService';
import type { EnviarMensajeInput, SugerenciasInput } from '../types/consultas';
import type { AuthRequest }    from '../types';

// ── POST /api/consultas/mensaje (SSE streaming) ───────────────────────────────

export async function mensaje(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body    = req.body as EnviarMensajeInput;
    const userId  = req.user!.userId;

    // Configurar SSE — sin buffering intermedio
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');   // Nginx: desactivar buffer
    res.flushHeaders();

    // Enviar keepalive inicial para que el cliente sepa que el stream abrió
    res.write(': keepalive\n\n');

    await procesarMensajeStream(body, userId, res);
  } catch (err) {
    if (!res.headersSent) {
      next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
    } else {
      // El stream ya empezó — enviar evento de error y cerrar
      res.write(`data: ${JSON.stringify({ type: 'error', error: (err as Error).message })}\n\n`);
      res.end();
    }
  }
}

// ── POST /api/consultas/sugerencias ──────────────────────────────────────────

export async function sugerencias(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body   = req.body as SugerenciasInput;
    const result = await obtenerSugerencias(body);
    res.status(200).json({ sugerencias: result });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/consultas/:casoId ────────────────────────────────────────────────

export async function historial(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { casoId } = req.params;
    const sesion     = await ChatSessionModel.findByCasoId(casoId);

    res.status(200).json({
      sesion:      sesion ?? null,
      totalTokens: sesion?.totalTokens ?? 0,
      guardada:    sesion?.guardada ?? false,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/consultas/:casoId/guardar ──────────────────────────────────────

export async function guardar(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { casoId } = req.params;
    const sesion     = await ChatSessionModel.guardar(casoId);
    res.status(200).json({ message: 'Consulta guardada.', sesionId: sesion.id });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/consultas/:casoId/reporte ──────────────────────────────────────

export async function reporte(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { casoId } = req.params;
    const userId     = req.user!.userId;
    const markdown   = await generarReporte(casoId, userId);
    res.status(200).json({ reporte: markdown });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}
