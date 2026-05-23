// ─────────────────────────────────────────────────────────────────────────────
// src/controllers/pacientes.controller.ts — Derma Copilot
// ─────────────────────────────────────────────────────────────────────────────

import { Response, NextFunction } from 'express';
import { AppError }              from '../middleware/errorHandler';
import { PacienteModel }         from '../models/Paciente';
import type { AuthRequest }      from '../types';
import type {
  CrearPacienteInput,
  ActualizarPacienteInput,
}                                from '../types/pacientes';

// ── GET /api/pacientes ────────────────────────────────────────────────────────

export async function listar(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId    = req.user!.userId;
    const pacientes = await PacienteModel.findByUserId(userId);
    res.status(200).json({ pacientes });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── POST /api/pacientes ───────────────────────────────────────────────────────

export async function crear(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId   = req.user!.userId;
    const paciente = await PacienteModel.create(userId, req.body as CrearPacienteInput);
    res.status(201).json({ message: 'Paciente creado.', paciente });
  } catch (err) {
    next(new AppError(500, (err as Error).message, false));
  }
}

// ── GET /api/pacientes/:id ────────────────────────────────────────────────────

export async function obtener(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paciente = await PacienteModel.findById(req.params.id);
    if (!paciente) throw new AppError(404, 'Paciente no encontrado.');
    res.status(200).json({ paciente });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}

// ── PUT /api/pacientes/:id ────────────────────────────────────────────────────

export async function actualizar(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paciente = await PacienteModel.update(
      req.params.id,
      req.body as ActualizarPacienteInput,
    );
    if (!paciente) throw new AppError(404, 'Paciente no encontrado.');
    res.status(200).json({ message: 'Paciente actualizado.', paciente });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, (err as Error).message, false));
  }
}
