// ─────────────────────────────────────────────────────────────────────────────
// types/consultas.ts — Derma Copilot Frontend
// Tipos del módulo de chat clínico (mirror del backend).
// ─────────────────────────────────────────────────────────────────────────────

export type RolMensaje = 'user' | 'assistant';

export interface MensajeChat {
  id:           string;
  role:         RolMensaje;
  contenido:    string;
  sugerencias?: string[];
  tokensUsados?: number;
  timestamp:    string;   // ISO string en el cliente
}

export interface SesionChat {
  id:          string;
  casoId:      string;
  userId:      string;
  titulo?:     string;
  mensajes:    MensajeChat[];
  totalTokens: number;
  guardada:    boolean;
  createdAt:   string;
  updatedAt:   string;
}

export interface ContextoCaso {
  sintomas:           string;
  diagnosticos?:      string[];
  urgencia?:          string;
  tratamientoActual?: string;
  notasAdicionales?:  string;
}

export interface EnviarMensajeData {
  casoId:        string;
  mensaje:       string;
  contextoCaso?: ContextoCaso;
}

// Eventos SSE recibidos del stream
export type EventoSSE =
  | { type: 'delta';  text: string }
  | { type: 'done';   sugerencias: string[]; tokensUsados: number; totalTokensSesion: number; mensajeId: string }
  | { type: 'error';  error: string };
