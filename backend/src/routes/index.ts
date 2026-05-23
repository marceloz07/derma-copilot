import { Router } from 'express';
import { ApiResponse } from '../types';
import authRouter      from './auth.routes';
import casosRouter     from './casos.routes';
import consultasRouter from './consultas.routes';
import reportesRouter  from './reportes.routes';
import pacientesRouter from './pacientes.routes';
import negocioRouter   from './negocio.routes';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  } satisfies ApiResponse);
});

// ── Módulos ───────────────────────────────────────────────────────────────────
router.use('/auth',       authRouter);
router.use('/casos',      casosRouter);
router.use('/consultas',  consultasRouter);
router.use('/reportes',   reportesRouter);
router.use('/pacientes',  pacientesRouter);
router.use('/negocio',    negocioRouter);

export default router;
