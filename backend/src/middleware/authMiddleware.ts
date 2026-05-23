import { NextFunction, Response } from 'express';
import { authService } from '../services/authService';
import { ApiResponse, AuthRequest, UserRole } from '../types';

// ── Verifica JWT en el header Authorization ───────────────────────────────────
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido',
    } satisfies ApiResponse);
    return;
  }

  const token = authHeader.slice(7); // quita "Bearer "

  try {
    req.user = authService.verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    } satisfies ApiResponse);
  }
}

// ── Guard de roles ────────────────────────────────────────────────────────────
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' } satisfies ApiResponse);
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`,
      } satisfies ApiResponse);
      return;
    }

    next();
  };
}
