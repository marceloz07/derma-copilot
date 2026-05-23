// ─────────────────────────────────────────────────────────────────────────────
// types/reportes.ts — Derma Copilot Frontend
// Tipos del módulo de reportes clínicos (mirror del backend).
// ─────────────────────────────────────────────────────────────────────────────

export interface Medicamento {
  nombre:         string;
  dosis:          string;
  frecuencia:     string;
  duracion:       string;
  instrucciones?: string;
}

export interface DatosEditables {
  pacienteNombre:          string;
  pacienteEmail:           string;
  pacienteEdad:            string;
  diagnosticoPrincipal:    string;
  diagnosticosSecundarios: string[];
  hallazgosClinica:        string;
  planTratamiento:         string;
  medicamentos:            Medicamento[];
  recomendaciones:         string[];
  seguimiento:             string;
  notasMedico:             string;
}

export interface GenerarReporteResponse {
  message:        string;
  reporteId:      string;
  htmlPreview:    string;
  datosEditables: DatosEditables;
}

export interface ActualizarReporteResponse {
  message:        string;
  reporteId:      string;
  htmlPreview:    string;
  datosEditables: DatosEditables;
}

export interface EnviarReporteData {
  emailDestino:    string;
  nombrePaciente?: string;
}

/** Item devuelto por GET /api/reportes */
export interface ReporteListItem {
  id:                   string;
  casoId:               string;
  pacienteNombre:       string;
  diagnosticoPrincipal: string;
  folio:                string;
  enviado:              boolean;
  emailEnviado?:        string;
  createdAt:            string;
}
