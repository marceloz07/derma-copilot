// ── Cargar variables de entorno PRIMERO — antes de cualquier otro import ──────
// dotenv.config() debe ejecutarse antes de que cualquier módulo lea process.env.
// Al compilar a CommonJS, TypeScript mueve todos los `import` al tope del
// archivo. Importando dotenv aquí (primer import del archivo) se garantiza que
// dotenv.config() corre antes de que env.ts, authService, etc. lean process.env.
import dotenv from 'dotenv';
dotenv.config();

// ── Imports ───────────────────────────────────────────────────────────────────
import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// TODO: registrar rutas pendientes
// app.use('/api/pacientes', pacientesRouter);
// app.use('/api/casos',     casosRouter);

// ── Arranque ──────────────────────────────────────────────────────────────────
app.listen(3001, () => console.log('Server running on port 3001'));

export default app;
