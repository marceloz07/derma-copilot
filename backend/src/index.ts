import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, validateEnv } from './config/env';

// Valida coherencia del entorno antes de montar la app
validateEnv();
import { authenticate } from './middleware/auth';
import { AppError, errorHandler, notFoundHandler } from './middleware/errorHandler';
import { AuthRequest } from './types';
import apiRoutes from './routes';

// ── Inicialización ────────────────────────────────────────────────────────────
const app = express();

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Rate limiting global ──────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  },
});
app.use(limiter);

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logger ────────────────────────────────────────────────────────────────────
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// ─────────────────────────────────────────────────────────────────────────────
// 🧪 RUTAS DE PRUEBA  (solo activas en desarrollo — quitar antes de producción)
// ─────────────────────────────────────────────────────────────────────────────
if (env.isDev) {
  // ── GET /ping ─── latencia básica del servidor ──────────────────────────────
  app.get('/ping', (_req: Request, res: Response) => {
    res.json({ pong: true, ts: Date.now() });
  });

  // ── GET /test/info ─── info del entorno ─────────────────────────────────────
  app.get('/test/info', (_req: Request, res: Response) => {
    res.json({
      env: env.NODE_ENV,
      port: env.PORT,
      corsOrigin: env.CORS_ORIGIN,
      uptime: `${process.uptime().toFixed(1)}s`,
      memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
      node: process.version,
    });
  });

  // ── POST /test/echo ─── devuelve el body recibido ───────────────────────────
  app.post('/test/echo', (req: Request, res: Response) => {
    res.json({
      received: req.body,
      headers: {
        contentType: req.headers['content-type'],
        authorization: req.headers['authorization']
          ? '*** (presente)' // no exponer el token en eco
          : '(ausente)',
      },
    });
  });

  // ── GET /test/protected ─── valida que el JWT middleware funcione ────────────
  app.get(
    '/test/protected',
    authenticate,
    (req: AuthRequest, res: Response) => {
      res.json({
        message: '✅ Token válido — acceso concedido',
        user: req.user,
      });
    },
  );

  // ── GET /test/error/:code ─── dispara errores intencionalmente ───────────────
  app.get('/test/error/:code', (req: Request, _res: Response, next: NextFunction) => {
    const code = parseInt(req.params.code, 10);
    const messages: Record<number, string> = {
      400: 'Petición malformada (simulada)',
      401: 'No autenticado (simulado)',
      403: 'Acceso prohibido (simulado)',
      404: 'Recurso no encontrado (simulado)',
      500: 'Error interno del servidor (simulado)',
    };
    next(new AppError(code, messages[code] ?? `Error ${code} simulado`));
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Rutas principales de la API ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Error handler (debe ir último) ───────────────────────────────────────────
app.use(errorHandler);

// ── Arranque ──────────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  console.log('');
  console.log('  🚀 Derma Copilot API');
  console.log(`  ► Entorno  : ${env.NODE_ENV}`);
  console.log(`  ► URL      : http://localhost:${env.PORT}/api`);
  console.log(`  ► Health   : http://localhost:${env.PORT}/api/health`);
  if (env.isDev) {
    console.log('');
    console.log('  🧪 Rutas de prueba:');
    console.log(`     GET  /ping`);
    console.log(`     GET  /test/info`);
    console.log(`     POST /test/echo`);
    console.log(`     GET  /test/protected   (requiere Bearer token)`);
    console.log(`     GET  /test/error/:code (400 | 401 | 403 | 404 | 500)`);
  }
  console.log('');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
  process.exit(1);
});

export default app;
