// ─────────────────────────────────────────────────────────────────────────────
// src/types/casos.ts — Derma Copilot
// Tipos del módulo de análisis de casos dermatológicos.
// ─────────────────────────────────────────────────────────────────────────────

export type Probabilidad = 'Alta' | 'Media' | 'Baja';
export type Urgencia     = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface DiagnosticoDiferencial {
  condicion:    string;
  probabilidad: Probabilidad;
  descripcion:  string;
  codigoCIE?:   string;   // CIE-10 cuando aplica
}

export interface PresupuestoEstimado {
  min:         number;
  max:         number;
  moneda:      string;   // 'USD' por defecto
  descripcion: string;
}

export interface SesionesNecesarias {
  cantidad:    number;
  frecuencia:  string;   // 'Semanal', 'Cada 2 semanas', etc.
  descripcion: string;
}

export interface AnalisisDermatologico {
  diagnosticoDiferencial: DiagnosticoDiferencial[];
  recomendaciones:        string[];
  presupuestoEstimado:    PresupuestoEstimado;
  sesionesNecesarias:     SesionesNecesarias;
  urgencia:               Urgencia;
  notasAdicionales:       string;
}

/** Body recibido por POST /api/casos/analizar */
export interface AnalizarCasoInput {
  sintomas:      string;
  imagenBase64?: string;   // Base64 sin prefijo data:...
  mimeType?:     'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

/** Caso persistido en la BD (o memoria) */
export interface Caso {
  id:           string;
  userId:       string;
  sintomas:     string;
  imagenBase64?: string;
  mimeType?:    string;
  analisis:     AnalisisDermatologico;
  createdAt:    Date;
}
