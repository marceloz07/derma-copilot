// ─────────────────────────────────────────────────────────────────────────────
// src/models/Automatizacion.ts — Derma Copilot
// Modelo en memoria para el módulo de Automatizaciones.
// TODO: migrar a Prisma → tablas automatizacion_conexiones,
//       automatizacion_config, automatizacion_logs
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type {
  ConexionServicio,
  ConfigAutomatizaciones,
  LogAutomatizacion,
  TipoServicio,
  EstadoLog,
  ConfigInput,
} from '../types/automatizaciones';

// ── Stores en memoria ─────────────────────────────────────────────────────────

const conexionesDb = new Map<string, ConexionServicio>();    // key = `${userId}:${servicio}`
const configDb     = new Map<string, ConfigAutomatizaciones>(); // key = userId
const logsDb       = new Map<string, LogAutomatizacion>();   // key = logId

// ── Helpers ───────────────────────────────────────────────────────────────────

function ck(userId: string, servicio: TipoServicio): string {
  return `${userId}:${servicio}`;
}

// ── Modelo ────────────────────────────────────────────────────────────────────

export const AutomatizacionModel = {

  // ── Conexiones ──────────────────────────────────────────────────────────────

  getConexion(userId: string, servicio: TipoServicio): ConexionServicio | undefined {
    return conexionesDb.get(ck(userId, servicio));
  },

  /** Crea o actualiza el estado de una conexión a CONECTADO. */
  setConexion(
    userId:        string,
    servicio:      TipoServicio,
    opts: {
      accessToken?:  string;
      refreshToken?: string;
      tokenExpiry?:  Date;
      metadata?:     Record<string, string>;
    } = {},
  ): ConexionServicio {
    const key      = ck(userId, servicio);
    const existing = conexionesDb.get(key);
    const now      = new Date();
    const conn: ConexionServicio = {
      id:           existing?.id ?? randomUUID(),
      userId,
      servicio,
      estado:       'conectado',
      accessToken:  opts.accessToken,
      refreshToken: opts.refreshToken,
      tokenExpiry:  opts.tokenExpiry,
      metadata:     opts.metadata ?? existing?.metadata ?? {},
      createdAt:    existing?.createdAt ?? now,
      updatedAt:    now,
    };
    conexionesDb.set(key, conn);
    return conn;
  },

  /** Marca la conexión como desconectada y elimina tokens. */
  desconectar(userId: string, servicio: TipoServicio): void {
    const conn = conexionesDb.get(ck(userId, servicio));
    if (!conn) return;
    conexionesDb.set(ck(userId, servicio), {
      ...conn,
      estado:       'desconectado',
      accessToken:  undefined,
      refreshToken: undefined,
      tokenExpiry:  undefined,
      updatedAt:    new Date(),
    });
  },

  // ── Configuración de toggles ────────────────────────────────────────────────

  getConfig(userId: string): ConfigAutomatizaciones {
    const existing = configDb.get(userId);
    if (existing) return existing;

    // Inicializar con todo desactivado
    const cfg: ConfigAutomatizaciones = {
      id:                  randomUUID(),
      userId,
      gcalCrearEvento:     false,
      gcalRecordatorio24h: false,
      waEnviarPropuesta:   false,
      waRecordatorio24h:   false,
      waReportePaciente:   false,
      smsConfirmacion:     false,
      smsRecordatorio48h:  false,
      updatedAt:           new Date(),
    };
    configDb.set(userId, cfg);
    return cfg;
  },

  updateConfig(userId: string, input: ConfigInput): ConfigAutomatizaciones {
    const cfg     = this.getConfig(userId);
    const updated = { ...cfg, ...input, updatedAt: new Date() };
    configDb.set(userId, updated);
    return updated;
  },

  // ── Logs de ejecución ───────────────────────────────────────────────────────

  addLog(
    userId:         string,
    servicio:       TipoServicio,
    tipo:           string,
    pacienteNombre: string,
    estado:         EstadoLog,
    detalle?:       string,
  ): LogAutomatizacion {
    const log: LogAutomatizacion = {
      id: randomUUID(),
      userId,
      servicio,
      tipo,
      pacienteNombre,
      estado,
      detalle,
      createdAt: new Date(),
    };
    logsDb.set(log.id, log);
    return log;
  },

  getLogs(userId: string, limit = 50): LogAutomatizacion[] {
    return [...logsDb.values()]
      .filter(l => l.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },
};
