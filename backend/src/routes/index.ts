import { Router } from 'express';
import { ApiResponse } from '../types';
import authRouter from './auth.routes';

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
router.use('/auth', authRouter);

// TODO: añadir más rutas aquí
// router.use('/patients', patientsRouter);
// router.use('/consultations', consultationsRouter);

export default router;
