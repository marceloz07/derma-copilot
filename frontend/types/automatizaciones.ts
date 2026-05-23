// ─────────────────────────────────────────────────────────────────────────────
// types/automatizaciones.ts — Derma Copilot Frontend
// Mirror de los tipos del módulo Automatizaciones (fechas como ISO string).
// ─────────────────────────────────────────────────────────────────────────────

export type TipoServicio    = 'google_calendar' | 'whatsapp' | 'sms';
export type EstadoConexion  = 'conectado' | 'desconectado' | 'pendiente';
export type TipoMensajeWA   = 'propuesta' | 'recordatorio' | 'reporte';
export type TipoMensajeSMS  = 'confirmacion' | 'recordatorio';
export type EstadoLog       = 'enviado' | 'error' | 'simulado';

// ── Config de toggles ─────────────────────────────────────────────────────────

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
  updatedAt:           string;
}

// ── Estado de una conexión ────────────────────────────────────────────────────

export interface EstadoConexionInfo {
  estado:   EstadoConexion;
  metadata: Record<string, string>;
  modoDemo: boolean;
}

export interface EstadoAutomatizaciones {
  config:     ConfigAutomatizaciones;
  conexiones: {
    google_calendar: EstadoConexionInfo;
    whatsapp:        EstadoConexionInfo;
    sms:             EstadoConexionInfo;
  };
}

// ── Log de ejecución ──────────────────────────────────────────────────────────

export interface LogAutomatizacion {
  id:             string;
  userId:         string;
  servicio:       TipoServicio;
  tipo:           string;
  pacienteNombre: string;
  estado:         EstadoLog;
  detalle?:       string;
  createdAt:      string;
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export type ConfigInput = Partial<
  Omit<ConfigAutomatizaciones, 'id' | 'userId' | 'updatedAt'>
>;

export interface CrearEventoInput {
  casoId:           string;
  fechaCita:        string;
  duracionMinutos?: number;
  titulo?:          string;
  descripcion?:     string;
  pacienteNombre?:  string;
}

export interface EnviarWhatsAppInput {
  pacienteId:  string;
  tipoMensaje: TipoMensajeWA;
  telefono:    string;
  datos?:      Record<string, string>;
}

export interface EnviarSMSInput {
  pacienteId:  string;
  tipoMensaje: TipoMensajeSMS;
  telefono:    string;
  datos?:      Record<string, string>;
}
