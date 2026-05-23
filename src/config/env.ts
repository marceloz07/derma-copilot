// ─────────────────────────────────────────────────────────────────────────────
// src/config/env.ts — Derma Copilot
// Centraliza y valida las variables de entorno al arrancar.
// ─────────────────────────────────────────────────────────────────────────────

// Carga el .env ANTES de leer process.env.
// Red de seguridad: aunque index.ts ya llama dotenv.config() primero,
// tenerlo aquí garantiza que este módulo funcione si se importa de forma
// aislada (tests, scripts CLI, seeds, etc.).
// Llamar dotenv.config() varias veces es seguro: no sobreescribe variables
// que ya existen en process.env.
import dotenv from 'dotenv';
dotenv.config();

function requireString(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optionalString(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error(`Env var ${key} must be an integer, got: "${raw}"`);
  return n;
}

// ── Exported config ───────────────────────────────────────────────────────────
export const env = {
  // Node
  NODE_ENV: optionalString('NODE_ENV', 'development'),
  get isDev()  { return this.NODE_ENV === 'development'; },
  get isProd() { return this.NODE_ENV === 'production';  },
  get isTest() { return this.NODE_ENV === 'test';        },

  // Server
  PORT: optionalInt('PORT', 3001),

  // Database
  DATABASE_URL: requireString('DATABASE_URL'),

  // JWT
  JWT_SECRET:             requireString('JWT_SECRET'),
  JWT_REFRESH_SECRET:     requireString('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN:         optionalString('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optionalString('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Bcrypt
  BCRYPT_ROUNDS: optionalInt('BCRYPT_ROUNDS', 12),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS:  optionalInt('RATE_LIMIT_WINDOW_MS',  900_000),  // 15 min
  AUTH_RATE_LIMIT_MAX:   optionalInt('AUTH_RATE_LIMIT_MAX',   10),
} as const;

// ── Startup validation ────────────────────────────────────────────────────────
export function validateEnv(): void {
  // Trigger all getters / requireString calls by accessing the object
  void env.DATABASE_URL;
  void env.JWT_SECRET;
  void env.JWT_REFRESH_SECRET;

  if (env.BCRYPT_ROUNDS < 10 || env.BCRYPT_ROUNDS > 14) {
    throw new Error(`BCRYPT_ROUNDS should be between 10 and 14, got ${env.BCRYPT_ROUNDS}`);
  }

  console.log(`[env] NODE_ENV=${env.NODE_ENV}  PORT=${env.PORT}`);
}
