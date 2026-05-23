// ─────────────────────────────────────────────────────────────────────────────
// types/casos.ts — Derma Copilot Frontend
// Tipos del módulo de análisis de casos. Deben coincidir con el backend.
// ─────────────────────────────────────────────────────────────────────────────

export type Probabilidad = 'Alta' | 'Media' | 'Baja';
export type Urgencia     = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface DiagnosticoDiferencial {
  condicion:    string;
  probabilidad: Probabilidad;
  descripcion:  string;
  codigoCIE?:   string;
}

export interface PresupuestoEstimado {
  min:         number;
  max:         number;
  moneda:      string;
  descripcion: string;
}

export interface SesionesNecesarias {
  cantidad:    number;
  frecuencia:  string;
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

/** Body enviado a POST /api/casos/analizar */
export interface AnalizarCasoData {
  sintomas:      string;
  imagenBase64?: string;
  mimeType?:     string;
}

/** Respuesta de POST /api/casos/analizar */
export interface AnalizarCasoResponse {
  message:  string;
  casoId:   string;
  analisis: AnalisisDermatologico;
}

/** Item devuelto por GET /api/casos */
export interface CasoListItem {
  id:        string;
  sintomas:  string;
  analisis:  AnalisisDermatologico;
  createdAt: string;
}
