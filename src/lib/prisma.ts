// ─────────────────────────────────────────────────────────────────────────────
// src/lib/prisma.ts — Derma Copilot
// Singleton del cliente Prisma para evitar múltiples conexiones en desarrollo.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';

// In development, hot-reload creates new module instances on every file change.
// Storing the client on `globalThis` ensures we reuse the same connection.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
