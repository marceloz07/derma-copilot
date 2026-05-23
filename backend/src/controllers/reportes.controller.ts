// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/reportes.controller.ts — Derma Copilot
//
// Handlers HTTP para el módulo de reportes clínicos.
//   POST  /api/reportes/generar      →  Genera HTML + PDF desde casoId
//   GET   /api/reportes/:id          →  Datos del reporte (HTML incluido)
//   PUT   /api/reportes/:id          →  Actualiza campos editables + regenera
//   GET   /api/reportes/:id/pdf      →  Descarga binaria del PDF
//   POST  /api/reportes/:id/enviar   →  Envía por email al paciente
// ─────────────────────────────────────────────────────────────────────────────

import { Response, NextFunction } from 'express';
import { AppError }               from '../middleware/errorHandler';
import { ReporteModel }           from '../models/Reporte';
import { CasoModel }              from '../models/Caso';
import {
  generarReporte,
  actualizarReporte,
  enviarReporte,
}                                 from '../services/reportesService';
import type { AuthRequest }       from '../types';
import type {
  Reporte,
  GenerarReporteInput,
  DatosEditables,
  EnviarReporteInput,
}                                 from '../types/reportes';

// ── GET /api/reportes — lista del usuario ─────────────────────────────────────

export async function listar(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId   = req.user!.userId;
    const reportes = await ReporteModel.findByUserId(userId);

    // Projection ligera (sin HTML completo)
    const items = reportes.map(r => ({
      id:                  r.id,
      casoId:              r.casoId,
      pacienteNombre:      r.datosEditables.pacienteNombre,
      diagnosticoPrincipal: r.datosEditables.diagnosticoPrincipal,
      folio:               `REP-${r.casoId.slice(0, 8).toUpperCase()}`,
      enviado:             r.enviado,
      emailEnviado:        r.emailEnviado,
      createdAt:           r.createdAt,
    }));

    res.status(200).json({ reportes: items });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/reportes/generar ────────────────────────────────────────────────

export async function generar(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const input  = req.body as GenerarReporteInput;

    // ── Idempotencia: devolver existente si ya fue generado ────────────────────
    let existente: Reporte | null = null;

    if (input.consultaId) {
      // Prioridad: buscar por consultaId del usuario
      existente = await ReporteModel.findByConsultaId(input.consultaId, userId);
    }

    if (!existente) {
      // Fallback: primer reporte del usuario para este casoId
      const porCaso = await ReporteModel.findByCasoId(input.casoId);
      existente     = porCaso.find(r => r.userId === userId) ?? null;
    }

    if (existente) {
      res.status(200).json({
        message:        'Reporte ya existente — recuperado sin duplicar.',
        reporteId:      existente.id,
        htmlPreview:    existente.contenidoHtml,
        datosEditables: existente.datosEditables,
        existing:       true,
      });
      return;
    }

    // ── No existe: crear uno nuevo ─────────────────────────────────────────────
    const reporte = await generarReporte(input, userId);

    res.status(201).json({
      message:        'Reporte generado correctamente.',
      reporteId:      reporte.id,
      htmlPreview:    reporte.contenidoHtml,
      datosEditables: reporte.datosEditables,
      existing:       false,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/reportes/:id ─────────────────────────────────────────────────────

export async function obtener(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporte = await ReporteModel.findById(req.params.id);
    if (!reporte) throw new AppError(404, 'Reporte no encontrado.');

    res.status(200).json({
      reporteId:      reporte.id,
      htmlPreview:    reporte.contenidoHtml,
      datosEditables: reporte.datosEditables,
      enviado:        reporte.enviado,
      emailEnviado:   reporte.emailEnviado,
      createdAt:      reporte.createdAt,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── PUT /api/reportes/:id — actualizar campos + regenerar PDF ─────────────────

export async function actualizar(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporte = await ReporteModel.findById(req.params.id);
    if (!reporte) throw new AppError(404, 'Reporte no encontrado.');

    const datosEditables = req.body as DatosEditables;
    const caso = await CasoModel.findById(reporte.casoId);

    const updated = await actualizarReporte(
      req.params.id,
      datosEditables,
      reporte.casoId,
      caso?.analisis?.urgencia,
      caso?.imagenBase64,
    );

    res.status(200).json({
      message:        'Reporte actualizado.',
      reporteId:      updated.id,
      htmlPreview:    updated.contenidoHtml,
      datosEditables: updated.datosEditables,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/reportes/:id/pdf — descarga binaria ──────────────────────────────

export async function descargarPdf(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporte = await ReporteModel.findById(req.params.id);
    if (!reporte) throw new AppError(404, 'Reporte no encontrado.');

    const pdfBuffer = ReporteModel.getPdfBuffer(req.params.id);
    if (!pdfBuffer) throw new AppError(404, 'PDF no disponible para este reporte.');

    const folio = `REP-${reporte.casoId.slice(0, 8).toUpperCase()}`;

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${folio}.pdf"`);
    res.setHeader('Content-Length',      pdfBuffer.length);
    res.setHeader('Cache-Control',       'no-cache');
    res.end(pdfBuffer);
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/reportes/:id/enviar ─────────────────────────────────────────────

export async function enviar(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporte = await ReporteModel.findById(req.params.id);
    if (!reporte) throw new AppError(404, 'Reporte no encontrado.');

    const input = req.body as EnviarReporteInput;
    await enviarReporte(req.params.id, input);

    res.status(200).json({
      message:  `Reporte enviado a ${input.emailDestino}.`,
      enviado:  true,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}
