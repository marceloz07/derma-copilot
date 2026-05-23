// ─────────────────────────────────────────────────────────────────────────────
// src/types/automatizaciones.ts — Derma Copilot
// Tipos del módulo de Automatizaciones (Google Calendar + WhatsApp + SMS).
// ─────────────────────────────────────────────────────────────────────────────

export type TipoServicio    = 'google_calendar' | 'whatsapp' | 'sms';
export type EstadoConexion  = 'conectado' | 'desconectado' | 'pendiente';
export type TipoMensajeWA   = 'propuesta' | 'recordatorio' | 'reporte';
export type TipoMensajeSMS  = 'confirmacion' | 'recordatorio';
export type EstadoLog       = 'enviado' | 'error' | 'simulado';

// ── Estado de conexión de un servicio externo ─────────────────────────────────

export interface ConexionServicio {
  id:            string;
  userId:        string;
  servicio:      TipoServicio;
  estado:        EstadoConexion;
  accessToken?:  string;
  refreshToken?: string;
  tokenExpiry?:  Date;
  metadata:      Record<string, string>;   // e.g. { phoneNumber, calendarId }
  createdAt:     Date;
  updatedAt:     Date;
}

// ── Configuración de automatizaciones del usuario ─────────────────────────────

export interface ConfigAutomatizaciones {
  id:                  string;
  userId:              string;
  gcalCrearEvento:     boolean;
  gcalRecordatorio24h: boolean;
  waEnviarPropuesta:   boolean;
  waRecordatorio24h:   boolean;
  waReportePaciente:   boolean;
  smsConfirmacion:     boolean;
  smsRecordatorio48h:  boolean;
  updatedAt:           Date;
}

export type ConfigInput = Partial<
  Omit<ConfigAutomatizaciones, 'id' | 'userId' | 'updatedAt'>
>;

// ── Log de ejecución ──────────────────────────────────────────────────────────

export interface LogAutomatizacion {
  id:             string;
  userId:         string;
  servicio:       TipoServicio;
  tipo:           string;
  pacienteNombre: string;
  estado:         EstadoLog;
  detalle?:       string;
  createdAt:      Date;
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface CrearEventoInput {
  casoId:           string;
  fechaCita:        string;          // ISO 8601
  duracionMinutos?: number;
  titulo?:          string;
  descripcion?:     string;
  pacienteNombre?:  string;
}

export interface EnviarWhatsAppInput {
  pacienteId:  string;
  tipoMensaje: TipoMensajeWA;
  telefono:    string;               // +57300...
  datos?:      Record<string, string>;
}

export interface EnviarSMSInput {
  pacienteId:  string;
  tipoMensaje: TipoMensajeSMS;
  telefono:    string;
  datos?:      Record<string, string>;
}

export interface ConectarWhatsAppInput {
  phoneNumber: string;   // número de WhatsApp del médico (+57300...)
}

export interface ConectarSMSInput {
  phoneNumber: string;   // número SMS del médico (+57300...)
}
