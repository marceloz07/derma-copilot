import { Request } from 'express';

// ── Usuario autenticado en el token ──────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ── Rol del usuario ───────────────────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
}

// ── Request con usuario autenticado ──────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ── Respuesta estándar de la API ──────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ── DTOs de autenticación ─────────────────────────────────────────────────────
export interface RegisterDto {
  nombre:        string;
  apellido?:     string;
  email:         string;
  password:      string;
  especialidad?: string;
  role?:         UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
