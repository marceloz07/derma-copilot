// ─────────────────────────────────────────────────────────────────────────────
// src/services/authService.ts — Derma Copilot
//
// ⚠️  IMPLEMENTACIÓN EN MEMORIA — solo para desarrollo/testing.
//     Cuando la BD esté lista, reemplazar las secciones marcadas con
//     "TODO: reemplazar con Prisma" por las llamadas a prisma.dermatologo.*
//     El contrato público (tipos + firmas) no cambia.
//
// Responsabilidades:
//   · Persistencia de usuarios (Map en memoria, sin DB)
//   · Hashing y verificación de contraseñas (bcrypt)
//   · Reglas de negocio (email único, credenciales válidas)
//
// NO conoce Express, HTTP, JWT ni req/res.
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// AuthError — error de dominio con código tipado
// ─────────────────────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | 'EMAIL_TAKEN'         // correo ya registrado
  | 'INVALID_CREDENTIALS' // email inexistente o contraseña incorrecta
  | 'USER_NOT_FOUND';     // findUserById / findUserByEmail → null

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  email:         string;
  password:      string;   // texto plano — el servicio lo hashea
  nombre:        string;
  apellido?:     string;
  especialidad?: string;
  numeroCedula?: string;
  telefono?:     string;
}

/** Proyección segura: nunca expone passwordHash. */
export interface SafeDermatologo {
  id:              string;
  email:           string;
  nombre:          string;
  apellido:        string | null;
  especialidad:    string;
  numeroCedula:    string | null;
  telefono:        string | null;
  planSuscripcion: string;
  createdAt:       Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store en memoria
// ─────────────────────────────────────────────────────────────────────────────

/** Registro completo almacenado en memoria (incluye passwordHash). */
interface StoredUser {
  id:              string;
  email:           string;
  passwordHash:    string;
  nombre:          string;
  apellido:        string | null;
  especialidad:    string;
  numeroCedula:    string | null;
  telefono:        string | null;
  planSuscripcion: string;
  createdAt:       Date;
  updatedAt:       Date;
}

/**
 * Store principal indexado por ID → O(1) en findUserById.
 * Se mantiene entre requests mientras el proceso esté vivo.
 * Se reinicia en cada arranque del servidor (no persiste).
 */
const usersById = new Map<string, StoredUser>();

/**
 * Índice secundario email → id → O(1) en findUserByEmail / duplicate check.
 * Se actualiza siempre junto con usersById.
 */
const emailIndex = new Map<string, string>();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────────────────────────────────────

/** Elimina passwordHash antes de devolver datos al caller. */
function sanitize(u: StoredUser): SafeDermatologo {
  return {
    id:              u.id,
    email:           u.email,
    nombre:          u.nombre,
    apellido:        u.apellido,
    especialidad:    u.especialidad,
    numeroCedula:    u.numeroCedula,
    telefono:        u.telefono,
    planSuscripcion: u.planSuscripcion,
    createdAt:       u.createdAt,
  };
}

/**
 * Hash ficticio con costo real (12 rounds).
 * Garantiza que bcrypt.compare siempre ejecute en tiempo constante
 * aunque el email no exista → previene timing oracle de enumeración.
 */
const DUMMY_HASH = '$2b$12$dummyhashpreventstimingattacksXXXXXXXXX';

// ─────────────────────────────────────────────────────────────────────────────
// createUser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra un nuevo usuario en el store en memoria.
 *
 * TODO: reemplazar con Prisma →
 *   await prisma.dermatologo.findUnique({ where: { email } })
 *   await prisma.dermatologo.create({ data: { ... } })
 *
 * @throws {AuthError} EMAIL_TAKEN — si el correo ya está registrado
 */
export async function createUser(input: CreateUserInput): Promise<SafeDermatologo> {
  // 1 ── Duplicate check
  if (emailIndex.has(input.email)) {
    throw new AuthError('EMAIL_TAKEN', 'El correo electrónico ya está registrado.');
  }

  // 2 ── Hash password
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  // 3 ── Persist en memoria
  const now: Date = new Date();
  const user: StoredUser = {
    id:              randomUUID(),
    email:           input.email,
    passwordHash,
    nombre:          input.nombre,
    apellido:        input.apellido     ?? null,
    especialidad:    input.especialidad ?? 'Dermatología',
    numeroCedula:    input.numeroCedula ?? null,
    telefono:        input.telefono     ?? null,
    planSuscripcion: 'free',
    createdAt:       now,
    updatedAt:       now,
  };

  usersById.set(user.id, user);
  emailIndex.set(user.email, user.id);

  // 4 ── Devolver proyección segura
  return sanitize(user);
}

// ─────────────────────────────────────────────────────────────────────────────
// validateCredentials
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica email + contraseña. Protección anti timing-attack incluida.
 *
 * TODO: reemplazar con Prisma →
 *   await prisma.dermatologo.findUnique({ where: { email } })
 *
 * @throws {AuthError} INVALID_CREDENTIALS — email o contraseña incorrectos
 */
export async function validateCredentials(
  email:    string,
  password: string,
): Promise<SafeDermatologo> {
  // 1 ── Buscar por email (vía índice secundario)
  const userId = emailIndex.get(email);
  const user   = userId !== undefined ? usersById.get(userId) : undefined;

  // 2 ── Siempre ejecutar bcrypt.compare (timing-safe)
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  // 3 ── Rechazar si no existe o contraseña incorrecta
  if (!user || !passwordMatch) {
    throw new AuthError('INVALID_CREDENTIALS', 'Credenciales inválidas.');
  }

  return sanitize(user);
}

// ─────────────────────────────────────────────────────────────────────────────
// findUserById
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca por UUID. Devuelve null si no existe.
 * Usado por GET /api/auth/me y POST /api/auth/refresh.
 *
 * TODO: reemplazar con Prisma →
 *   await prisma.dermatologo.findUnique({ where: { id } })
 */
export async function findUserById(id: string): Promise<SafeDermatologo | null> {
  const user = usersById.get(id);
  return user !== undefined ? sanitize(user) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// findUserByEmail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca por correo. Devuelve null si no existe.
 *
 * TODO: reemplazar con Prisma →
 *   await prisma.dermatologo.findUnique({ where: { email } })
 */
export async function findUserByEmail(email: string): Promise<SafeDermatologo | null> {
  const userId = emailIndex.get(email);
  if (userId === undefined) return null;
  const user = usersById.get(userId);
  return user !== undefined ? sanitize(user) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de testing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vacía el store completamente.
 * Usar en beforeEach() de tests para partir de un estado limpio.
 * NO exportar en producción — solo para desarrollo y testing.
 */
export function __resetStore(): void {
  usersById.clear();
  emailIndex.clear();
}

/**
 * Devuelve una copia de todos los usuarios (sin passwordHash).
 * Útil para depurar el estado del store durante desarrollo.
 */
export function __getUsers(): SafeDermatologo[] {
  return Array.from(usersById.values()).map(sanitize);
}
