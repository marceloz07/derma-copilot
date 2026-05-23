// ─────────────────────────────────────────────────────────────────────────────
// src/types/consultas.ts — Derma Copilot
// Tipos del módulo de chat clínico.
// ─────────────────────────────────────────────────────────────────────────────

export type RolMensaje = 'user' | 'assistant';

export interface MensajeChat {
  id:           string;
  role:         RolMensaje;
  contenido:    string;
  sugerencias?: string[];
  tokensUsados?: number;
  timestamp:    Date;
}

export interface SesionChat {
  id:          string;
  casoId:      string;
  userId:      string;
  titulo?:     string;
  mensajes:    MensajeChat[];
  totalTokens: number;
  guardada:    boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

/** Contexto del caso que se inyecta en el system prompt del chat */
export interface ContextoCaso {
  sintomas:           string;
  diagnosticos?:      string[];   // ['Dermatitis atópica', ...]
  urgencia?:          string;
  tratamientoActual?: string;
  notasAdicionales?:  string;
}

/** Body de POST /api/consultas/mensaje */
export interface EnviarMensajeInput {
  casoId:        string;
  mensaje:       string;
  contextoCaso?: ContextoCaso;
}

/** Body de POST /api/consultas/sugerencias */
export interface SugerenciasInput {
  texto:         string;          // texto parcial que el médico está escribiendo
  contextoCaso?: ContextoCaso;
}

/** Respuesta de POST /api/consultas/mensaje (evento 'done' del SSE) */
export interface RespuestaChat {
  mensajeId:         string;
  contenido:         string;
  sugerencias:       string[];
  tokensUsados:      number;
  totalTokensSesion: number;
}
