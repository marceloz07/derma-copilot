import { Router } from 'express';
import { login, me, refresh, register } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route  POST /api/auth/register
 * @access Público
 * @desc   Registra un nuevo usuario
 */
router.post('/register', register);

/**
 * @route  POST /api/auth/login
 * @access Público
 * @desc   Inicia sesión y devuelve access + refresh tokens
 */
router.post('/login', login);

/**
 * @route  POST /api/auth/refresh
 * @access Público (con refresh token válido)
 * @desc   Renueva el access token usando el refresh token
 */
router.post('/refresh', refresh);

/**
 * @route  GET /api/auth/me
 * @access Privado
 * @desc   Devuelve el perfil del usuario autenticado
 */
router.get('/me', authenticate, me);

export default router;
