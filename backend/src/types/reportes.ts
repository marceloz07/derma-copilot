// ─────────────────────────────────────────────────────────────────────────────
// src/types/reportes.ts — Derma Copilot
// Tipos del módulo de generación de reportes clínicos.
// ─────────────────────────────────────────────────────────────────────────────

export interface Medicamento {
  nombre:        string;
  dosis:         string;
  frecuencia:    string;
  duracion:      string;
  instrucciones?: string;
}

/** Campos que el médico puede editar antes de generar el PDF final. */
export interface DatosEditables {
  pacienteNombre:           string;
  pacienteEmail:            string;
  pacienteEdad:             string;
  diagnosticoPrincipal:     string;
  diagnosticosSecundarios:  string[];
  hallazgosClinica:         string;
  planTratamiento:          string;
  medicamentos:             Medicamento[];
  recomendaciones:          string[];
  seguimiento:              string;
  notasMedico:              string;
}

/** Reporte persistido (en memoria / BD). */
export interface Reporte {
  id:             string;
  casoId:         string;
  consultaId?:    string;
  userId:         string;
  datosEditables: DatosEditables;
  contenidoHtml:  string;
  createdAt:      Date;
  updatedAt:      Date;
  enviado:        boolean;
  emailEnviado?:  string;
}

// ── I/O de endpoints ──────────────────────────────────────────────────────────

export interface GenerarReporteInput {
  casoId:           string;
  consultaId?:      string;
  datosEditables?:  Partial<DatosEditables>;
}

export interface EnviarReporteInput {
  emailDestino:    string;
  nombrePaciente?: string;
}
