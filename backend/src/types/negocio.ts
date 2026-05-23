// ─────────────────────────────────────────────────────────────────────────────
// src/types/negocio.ts — Derma Copilot
// Tipos del módulo Asesor Comercial / Negocio.
// ─────────────────────────────────────────────────────────────────────────────

export type EstructuraPaquete  = 'basico' | 'estandar' | 'premium';
export type CategoriaScript    = 'educacion' | 'seguimiento' | 'prevencion' | 'estetico';
export type TipoPosicionamiento = 'economico' | 'promedio' | 'premium' | 'ultra-premium';

// ── Catálogos (para dropdowns) ────────────────────────────────────────────────

export interface ItemCatalogo { id: string; label: string }

// ── Benchmarking ──────────────────────────────────────────────────────────────

export interface OpcionPosicionamiento {
  rangoMin:    number;         // límite inferior en USD equiv.
  rangoMax:    number | null;  // límite superior; null = sin techo
  descripcion: string;
  precioRef:   number;         // precio orientativo en USD equiv.
}

export interface ResultadoBenchmarking {
  tratamiento:      string;
  tratamientoLabel: string;
  zona:             string;
  zonaLabel:        string;
  precios: {
    minimo:   number;
    promedio: number;
    maximo:   number;
  };
  unidad:        string;   // "por sesión", "por zona", "por ml"
  codigoMoneda:  string;   // 'COP', 'MXN', 'USD', 'ARS', 'CLP', 'PEN'
  tasaCambio:    number;   // factor de conversión desde USD (p. ej. 4200 para COP)
  posicionamientos: {
    economico:    OpcionPosicionamiento;
    promedio:     OpcionPosicionamiento;
    premium:      OpcionPosicionamiento;
    ultraPremium: OpcionPosicionamiento;
  };
  notaMercado:      string;
  notaTratamiento:  string;
}

// ── Precio registrado (historial del médico) ──────────────────────────────────

export interface PrecioRegistrado {
  id:               string;
  userId:           string;
  tratamiento:      string;
  tratamientoLabel: string;
  zona:             string;
  zonaLabel:        string;
  precioFinal:      number;
  unidad:           string;
  posicionamiento:  TipoPosicionamiento;
  benchmarkMin:     number;
  benchmarkProm:    number;
  benchmarkMax:     number;
  diferencial:      number;   // precioFinal − benchmarkProm
  notas:            string;
  createdAt:        Date;
  updatedAt:        Date;
}

export interface RegistrarPrecioInput {
  tratamiento:     string;
  zona:            string;
  precioFinal:     number;
  posicionamiento: TipoPosicionamiento;
  notas?:          string;
}

// ── Analytics benchmarking ────────────────────────────────────────────────────

export interface ResumenBenchmarking {
  totalRegistros:         number;
  tratamientoMasRentable: string | null;   // precio absoluto más alto
  tratamientoMasPremium:  string | null;   // mayor ratio vs mercado
  precioPromedio:         number;
}

// ── Paquetes personalizados ───────────────────────────────────────────────────

export interface SugerenciaPaquete {
  tipo:              EstructuraPaquete;
  nombre:            string;
  sesiones:          number;
  duracionMinutos:   number;
  periodicidad:      string;
  descripcion:       string;
  incluyeEvaluacion: boolean;
}

export interface PaquetePersonalizado {
  id:              string;
  userId:          string;
  nombre:          string;
  tipo:            EstructuraPaquete;
  tratamiento:     string;
  sesiones:        number;
  duracionMinutos: number;
  periodicidad:    string;
  precioFinal:     number;
  descripcion:     string;
  activo:          boolean;
  createdAt:       Date;
  updatedAt:       Date;
}

export interface CrearPaqueteInput {
  nombre:          string;
  tipo:            EstructuraPaquete;
  tratamiento:     string;
  sesiones:        number;
  duracionMinutos: number;
  periodicidad:    string;
  precioFinal:     number;
  descripcion?:    string;
}

// ── Registro de resultados (paquetes) ─────────────────────────────────────────

export interface RegistroAceptacion {
  id:          string;
  userId:      string;
  paqueteId:   string;
  pacienteRef: string;
  aceptado:    boolean;
  createdAt:   Date;
}

export interface RegistrarAceptacionInput {
  aceptado:     boolean;
  pacienteRef?: string;
}

// ── Analytics paquetes ────────────────────────────────────────────────────────

export interface AnalyticsPaquete {
  paqueteId:      string;
  nombre:         string;
  tipo:           EstructuraPaquete;
  tratamiento:    string;
  precioFinal:    number;
  totalOfertas:   number;
  totalAceptados: number;
  tasaConversion: number;
  ingresoTotal:   number;
}

export interface ResumenAnalytics {
  totalOfertas:         number;
  totalAceptados:       number;
  tasaConversionGlobal: number;
  ingresoTotalEstimado: number;
  mejorPaquete:         string | null;
}

// ── Scripts ───────────────────────────────────────────────────────────────────

export interface ScriptVenta {
  id:          string;
  condicion:   string;
  titulo:      string;
  categoria:   CategoriaScript;
  intro:       string;
  puntosValor: string[];
  cierre:      string;
}
