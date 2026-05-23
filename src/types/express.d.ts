// ─────────────────────────────────────────────────────────────────────────────
// src/types/express.d.ts — Derma Copilot
//
// Augments the Express Request interface so that req.user is typed everywhere
// without casting. The middleware `authenticate` is the only place that writes
// this property; all route handlers can read it safely after that middleware.
//
// No imports here — this is a pure global declaration file (ambient module).
// TypeScript merges it automatically with Express's own Request interface.
// ─────────────────────────────────────────────────────────────────────────────

declare namespace Express {
  interface Request {
    /**
     * Payload del JWT verificado.
     * Inyectado por `authenticate` o `optionalAuth` de authMiddleware.ts.
     * Es `undefined` en rutas públicas no protegidas.
     */
    user?: {
      /** Dermatologo.id (UUID) */
      sub:   string;
      email: string;
      /** Issued-at (epoch seconds) */
      iat:   number;
      /** Expiry (epoch seconds) */
      exp:   number;
    };
  }
}
