// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/negocio.controller.ts — Derma Copilot
//
// GET  /api/negocio/catalogo          → tratamientos + zonas para dropdowns
// GET  /api/negocio/benchmarking?t=&z= → rango de mercado
// GET  /api/negocio/precios           → historial de precios del médico
// POST /api/negocio/precios           → guarda precio final
// GET  /api/negocio/sugerencias?t=    → estructura de paquetes sugerida
// GET  /api/negocio/scripts?cat=      → scripts educativos
// GET  /api/negocio/analytics         → analytics combinados
// GET  /api/negocio/paquetes          → lista paquetes personalizados
// POST /api/negocio/paquetes          → crea paquete
// PUT  /api/negocio/paquetes/:id      → actualiza paquete
// POST /api/negocio/paquetes/:id/aceptacion → registra resultado
// ─────────────────────────────────────────────────────────────────────────────

import { Response, NextFunction } from 'express';
import { AppError }               from '../middleware/errorHandler';
import { NegocioModel }           from '../models/Negocio';
import {
  getTratamientos,
  getZonas,
  getBenchmarking,
  detectarPosicionamiento,
  getSugerenciasPaquetes,
  getScripts,
  getAnalytics,
}                                 from '../services/negocioService';
import type { AuthRequest }       from '../types';
import type {
  CrearPaqueteInput,
  RegistrarAceptacionInput,
  RegistrarPrecioInput,
  CategoriaScript,
}                                 from '../types/negocio';

// ── GET /api/negocio/catalogo ─────────────────────────────────────────────────

export async function catalogo(
  _req: AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json({
      tratamientos: getTratamientos(),
      zonas:        getZonas(),
    });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/negocio/benchmarking?tratamiento=X&zona=Y ────────────────────────

export async function benchmarking(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tratamiento = String(req.query.tratamiento ?? '').trim();
    const zona        = String(req.query.zona        ?? '').trim();

    if (!tratamiento) throw new AppError(400, 'El parámetro "tratamiento" es requerido.');
    if (!zona)        throw new AppError(400, 'El parámetro "zona" es requerido.');

    const resultado = getBenchmarking(tratamiento, zona);
    if (!resultado) {
      throw new AppError(404, `No hay datos de benchmarking para tratamiento "${tratamiento}" en zona "${zona}".`);
    }

    res.status(200).json({ resultado });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/negocio/precios ──────────────────────────────────────────────────

export async function listarPrecios(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const precios = await NegocioModel.findPreciosByUser(userId);
    res.status(200).json({ precios });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/negocio/precios ─────────────────────────────────────────────────

export async function registrarPrecio(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const input  = req.body as RegistrarPrecioInput;

    // Obtener benchmark para calcular diferencial y posicionamiento auto
    const bench = getBenchmarking(input.tratamiento, input.zona);
    if (!bench) {
      throw new AppError(400, `Tratamiento o zona no reconocidos: "${input.tratamiento}" / "${input.zona}".`);
    }

    const posicionamiento = detectarPosicionamiento(
      input.precioFinal,
      bench.precios.promedio,
    );

    const precio = await NegocioModel.registrarPrecio({
      userId,
      tratamiento:      input.tratamiento,
      zona:             input.zona,
      precioFinal:      input.precioFinal,
      posicionamiento,
      notas:            input.notas,
      tratamientoLabel: bench.tratamientoLabel,
      zonaLabel:        bench.zonaLabel,
      unidad:           bench.unidad,
      benchmarkMin:     bench.precios.minimo,
      benchmarkProm:    bench.precios.promedio,
      benchmarkMax:     bench.precios.maximo,
    });

    res.status(201).json({
      message:       'Precio guardado correctamente.',
      precio,
      posicionamiento,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/negocio/sugerencias?tratamiento=Y ────────────────────────────────

export async function sugerencias(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tratamiento = String(req.query.tratamiento ?? 'general').trim();
    res.status(200).json({ sugerencias: getSugerenciasPaquetes(tratamiento) });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/negocio/scripts?categoria=X ─────────────────────────────────────

export async function scripts(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categoria = req.query.categoria as CategoriaScript | undefined;
    res.status(200).json({ scripts: getScripts(categoria) });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/negocio/analytics ────────────────────────────────────────────────

export async function analytics(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json(await getAnalytics(req.user!.userId));
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── Paquetes ──────────────────────────────────────────────────────────────────

export async function listarPaquetes(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json({ paquetes: await NegocioModel.findPaquetesByUser(req.user!.userId) });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

export async function crearPaquete(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paquete = await NegocioModel.createPaquete({ ...req.body as CrearPaqueteInput, userId: req.user!.userId });
    res.status(201).json({ message: 'Paquete creado correctamente.', paquete });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

export async function actualizarPaquete(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paquete = await NegocioModel.findPaqueteById(req.params.id);
    if (!paquete)                             throw new AppError(404, 'Paquete no encontrado.');
    if (paquete.userId !== req.user!.userId)  throw new AppError(403, 'No autorizado.');

    res.status(200).json({
      message: 'Paquete actualizado.',
      paquete: await NegocioModel.updatePaquete(req.params.id, req.body as Partial<CrearPaqueteInput>),
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

export async function registrarAceptacion(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId  = req.user!.userId;
    const paquete = await NegocioModel.findPaqueteById(req.params.id);
    if (!paquete) throw new AppError(404, 'Paquete no encontrado.');

    const { aceptado, pacienteRef } = req.body as RegistrarAceptacionInput;
    if (typeof aceptado !== 'boolean') throw new AppError(400, '"aceptado" debe ser boolean.');

    const registro = await NegocioModel.registrarAceptacion({
      userId, paqueteId: req.params.id, pacienteRef: pacienteRef ?? '', aceptado,
    });

    res.status(201).json({
      message: aceptado ? 'Aceptación registrada.' : 'Rechazo registrado.',
      registro,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}
