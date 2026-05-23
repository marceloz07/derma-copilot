// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/casos.controller.ts — Derma Copilot
//
// Handlers HTTP para el módulo de análisis de casos.
//   POST  /api/casos/analizar   →  Analiza foto + síntomas con Claude
//   GET   /api/casos            →  Lista casos del usuario autenticado
// ─────────────────────────────────────────────────────────────────────────────

import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { analizarCaso, getCasosByUser } from '../services/casosService';
import { CasoModel } from '../models/Caso';
import type { AnalizarCasoInput } from '../types/casos';
import type { AuthRequest } from '../types';

// ── Validadores de imagen ─────────────────────────────────────────────────────

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB
const VALID_MIME_TYPES     = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImage(imagenBase64?: string, mimeType?: string): void {
  if (!imagenBase64 && !mimeType) return;  // sin imagen — análisis solo por síntomas

  if (!imagenBase64) throw new AppError(400, 'Se proporcionó mimeType pero no imagen.');
  if (!mimeType)     throw new AppError(400, 'Se proporcionó imagen pero no mimeType.');

  if (!VALID_MIME_TYPES.includes(mimeType)) {
    throw new AppError(400, `Tipo de imagen no soportado: ${mimeType}. Use JPEG, PNG, WebP o GIF.`);
  }

  // Estimar tamaño: base64 ≈ 4/3 del tamaño original
  const estimatedBytes = (imagenBase64.length * 3) / 4;
  if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError(413, 'La imagen supera el tamaño máximo de 10 MB.');
  }
}

// ── POST /api/casos/analizar ──────────────────────────────────────────────────

/**
 * Recibe síntomas y opcionalmente una imagen en base64.
 * Llama a Claude Vision y retorna un análisis dermatológico estructurado.
 *
 * Body: { sintomas: string, imagenBase64?: string, mimeType?: string }
 * 201:  { casoId, analisis }
 */
export async function analizar(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sintomas, imagenBase64, mimeType } = req.body as AnalizarCasoInput;
    const userId = req.user!.userId;

    // Validar imagen si se proporcionó
    validateImage(imagenBase64, mimeType);

    // El servicio orquesta Claude + persistencia
    const caso = await analizarCaso({ sintomas, imagenBase64, mimeType }, userId);

    res.status(201).json({
      message:  'Análisis completado.',
      casoId:   caso.id,
      analisis: caso.analisis,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/casos ────────────────────────────────────────────────────────────

/**
 * Devuelve todos los casos del usuario autenticado (sin imagen).
 *
 * 200: { casos: Caso[] }
 */
export async function listarCasos(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const casos  = await getCasosByUser(userId);
    res.status(200).json({ casos });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/casos/:id ────────────────────────────────────────────────────────

export async function obtenerCaso(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const caso = await CasoModel.findById(req.params.id);
    if (!caso) {
      throw new AppError(404, 'Caso no encontrado.');
    }
    res.status(200).json({ caso: CasoModel.sanitize(caso) });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}
