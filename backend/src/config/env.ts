import dotenv from 'dotenv';
import path from 'path';

// Carga el .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de lectura
// ─────────────────────────────────────────────────────────────────────────────

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`❌ Variable de entorno requerida no encontrada: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`❌ ${key} debe ser un número entero, recibido: "${raw}"`);
  return parsed;
}

function optionalBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true';
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración exportada
// ─────────────────────────────────────────────────────────────────────────────

export const env = {

  // ── Servidor ────────────────────────────────────────────────────────────────
  APP_NAME:    optional('APP_NAME', 'Derma Copilot API'),
  API_VERSION: optional('API_VERSION', 'v1'),
  PORT:        optionalInt('PORT', 3000),
  NODE_ENV:    optional('NODE_ENV', 'development'),
  LOG_LEVEL:   optional('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'http' | 'debug',

  // Flags derivados — no leer de .env directamente
  isDev:  optional('NODE_ENV', 'development') === 'development',
  isProd: optional('NODE_ENV', 'development') === 'production',
  isTest: optional('NODE_ENV', 'development') === 'test',

  // ── JWT ─────────────────────────────────────────────────────────────────────
  JWT_SECRET:              required('JWT_SECRET'),
  JWT_EXPIRES_IN:          optional('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET:      required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN:  optional('JWT_REFRESH_EXPIRES_IN', '30d'),

  // ── Base de Datos ────────────────────────────────────────────────────────────
  DATABASE_URL: optional('DATABASE_URL', ''),

  // ── Redis ────────────────────────────────────────────────────────────────────
  REDIS_URL:      optional('REDIS_URL', ''),
  REDIS_PASSWORD: optional('REDIS_PASSWORD', ''),

  // ── CORS ─────────────────────────────────────────────────────────────────────
  // Soporta múltiples orígenes separados por coma: "https://a.com,https://b.com"
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),

  // ── Rate Limiting ─────────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS:   optionalInt('RATE_LIMIT_WINDOW_MS', 900_000), // 15 min
  RATE_LIMIT_MAX:         optionalInt('RATE_LIMIT_MAX', 100),
  AUTH_RATE_LIMIT_MAX:    optionalInt('AUTH_RATE_LIMIT_MAX', 10),

  // ── Seguridad ────────────────────────────────────────────────────────────────
  BCRYPT_SALT_ROUNDS: optionalInt('BCRYPT_SALT_ROUNDS', 12),
  ENCRYPTION_KEY:     optional('ENCRYPTION_KEY', ''),  // AES-256, 32 bytes hex
  OTP_SECRET:         optional('OTP_SECRET', ''),       // HMAC para tokens OTP

  // ── Email / SMTP ─────────────────────────────────────────────────────────────
  SMTP_HOST:      optional('SMTP_HOST', ''),
  SMTP_PORT:      optionalInt('SMTP_PORT', 587),
  SMTP_SECURE:    optionalBool('SMTP_SECURE', false),
  SMTP_USER:      optional('SMTP_USER', ''),
  SMTP_PASS:      optional('SMTP_PASS', ''),
  SMTP_FROM:      optional('SMTP_FROM', 'noreply@dermacopilot.com'),
  SMTP_FROM_NAME: optional('SMTP_FROM_NAME', 'Derma Copilot'),

  // ── Storage de Archivos ───────────────────────────────────────────────────────
  STORAGE_PROVIDER:    optional('STORAGE_PROVIDER', 'local') as 'local' | 's3' | 'cloudinary',
  AWS_REGION:          optional('AWS_REGION', 'us-east-1'),
  AWS_ACCESS_KEY_ID:   optional('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_KEY:      optional('AWS_SECRET_ACCESS_KEY', ''),
  AWS_S3_BUCKET:       optional('AWS_S3_BUCKET', ''),
  AWS_S3_ENDPOINT:     optional('AWS_S3_ENDPOINT', ''),   // MinIO / Cloudflare R2
  CLOUDINARY_CLOUD:    optional('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY:  optional('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET', ''),

  // ── Inteligencia Artificial ───────────────────────────────────────────────────
  ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY', ''),
  ANTHROPIC_MODEL:   optional('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
  AI_TIMEOUT_MS:     optionalInt('AI_TIMEOUT_MS', 30_000),

  // ── SendGrid / Email transaccional ───────────────────────────────────────────
  SENDGRID_API_KEY:    optional('SENDGRID_API_KEY', ''),
  SENDGRID_FROM_EMAIL: optional('SENDGRID_FROM_EMAIL', 'reportes@dermacopilot.com'),
  SENDGRID_FROM_NAME:  optional('SENDGRID_FROM_NAME', 'Derma Copilot'),

  // ── Datos de la clínica (reportes) ───────────────────────────────────────────
  CLINICA_NOMBRE:     optional('CLINICA_NOMBRE', 'Derma Copilot'),
  CLINICA_DIRECCION:  optional('CLINICA_DIRECCION', 'Av. Dermatología 123'),
  CLINICA_TELEFONO:   optional('CLINICA_TELEFONO', '+1 (555) 000-0000'),
  CLINICA_EMAIL:      optional('CLINICA_EMAIL', 'contacto@dermacopilot.com'),
  CLINICA_MEDICO:     optional('CLINICA_MEDICO', 'Dr. Especialista en Dermatología'),
  CLINICA_CEDULA:     optional('CLINICA_CEDULA', ''),

  // ── URLs del Sistema ──────────────────────────────────────────────────────────
  API_URL:    optional('API_URL', 'http://localhost:3000'),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),

  // ── Google Calendar OAuth2 ────────────────────────────────────────────────────
  // Consola: https://console.cloud.google.com → APIs & Services → Credentials
  GOOGLE_CLIENT_ID:     optional('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_REDIRECT_URI:  optional('GOOGLE_REDIRECT_URI', 'http://localhost:3001/api/automatizaciones/google/callback'),

  // ── Twilio (SMS + WhatsApp) ───────────────────────────────────────────────────
  // Dashboard: https://console.twilio.com
  TWILIO_ACCOUNT_SID:     optional('TWILIO_ACCOUNT_SID', ''),
  TWILIO_AUTH_TOKEN:      optional('TWILIO_AUTH_TOKEN', ''),
  TWILIO_PHONE_NUMBER:    optional('TWILIO_PHONE_NUMBER', ''),           // +1234567890 para SMS
  TWILIO_WHATSAPP_NUMBER: optional('TWILIO_WHATSAPP_NUMBER', '+14155238886'), // sandbox Twilio

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Validación de coherencia en arranque
// Lanza errores descriptivos antes de que la app falle de forma críptica.
// ─────────────────────────────────────────────────────────────────────────────

export function validateEnv(): void {
  const errors: string[] = [];

  // JWT secrets no pueden ser iguales
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_SECRET y JWT_REFRESH_SECRET no pueden ser iguales.');
  }

  // Secrets demasiado cortos
  if (env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET debe tener al menos 32 caracteres.');
  }
  if (env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET debe tener al menos 32 caracteres.');
  }

  // En producción, DATABASE_URL es obligatoria
  if (env.isProd && !env.DATABASE_URL) {
    errors.push('DATABASE_URL es requerida en producción.');
  }

  // En producción, CORS_ORIGIN no debería ser localhost
  if (env.isProd && env.CORS_ORIGIN.includes('localhost')) {
    errors.push('CORS_ORIGIN contiene "localhost" en entorno de producción.');
  }

  // ENCRYPTION_KEY debe ser exactamente 64 hex chars (32 bytes) si está definida
  if (env.ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(env.ENCRYPTION_KEY)) {
    errors.push('ENCRYPTION_KEY debe ser exactamente 64 caracteres hexadecimales (32 bytes).');
  }

  if (errors.length > 0) {
    throw new Error(
      `\n❌ Errores de configuración del entorno:\n${errors.map(e => `   · ${e}`).join('\n')}\n`,
    );
  }
}
