import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { AuthTokens, JwtPayload, LoginDto, RegisterDto, UserRole } from '../types';

export class AuthService {
  // ── Registro ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ user: ReturnType<typeof UserModel.sanitize>; tokens: AuthTokens }> {
    const existing = await UserModel.findByEmail(dto.email);
    if (existing) {
      throw new Error('El correo ya está registrado');
    }

    const user = await UserModel.create({
      nombre:          dto.nombre,
      apellido:        dto.apellido ?? null,
      email:           dto.email,
      password:        dto.password,
      especialidad:    dto.especialidad ?? 'Dermatología',
      numeroCedula:    null,
      telefono:        null,
      planSuscripcion: 'free',
      role:            dto.role ?? UserRole.DOCTOR,
    });

    const tokens = this.generateTokens({ userId: user.id, email: user.email, role: user.role });

    return { user: UserModel.sanitize(user), tokens };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<{ user: ReturnType<typeof UserModel.sanitize>; tokens: AuthTokens }> {
    const user = await UserModel.findByEmail(dto.email);
    if (!user) throw new Error('Credenciales inválidas');

    const validPassword = await UserModel.verifyPassword(dto.password, user.password);
    if (!validPassword) throw new Error('Credenciales inválidas');

    const tokens = this.generateTokens({ userId: user.id, email: user.email, role: user.role });

    return { user: UserModel.sanitize(user), tokens };
  }

  // ── Refresh Token ─────────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new Error('Refresh token inválido o expirado');
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) throw new Error('Usuario no encontrado');

    return this.generateTokens({ userId: user.id, email: user.email, role: user.role });
  }

  // ── Helper: genera access + refresh tokens ────────────────────────────────
  private generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken, expiresIn: env.JWT_EXPIRES_IN };
  }

  // ── Verifica un access token ──────────────────────────────────────────────
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }
}

export const authService = new AuthService();
