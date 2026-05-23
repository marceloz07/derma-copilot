// ─────────────────────────────────────────────────────────────────────────────
// types/auth.ts — Derma Copilot Frontend
// Tipos compartidos entre la API, el contexto y los componentes.
// ─────────────────────────────────────────────────────────────────────────────

/** Perfil del dermatólogo tal como lo devuelve el backend. */
export interface User {
  id:              string;
  email:           string;
  nombre:          string;
  apellido:        string | null;
  especialidad:    string;
  numeroCedula:    string | null;
  telefono:        string | null;
  planSuscripcion: string;
  createdAt:       string;   // ISO-8601 como string (JSON)
}

/** Credenciales para POST /api/auth/login */
export interface LoginCredentials {
  email:    string;
  password: string;
}

/** Datos de registro para POST /api/auth/register */
export interface RegisterData {
  email:         string;
  password:      string;
  nombre:        string;
  apellido?:     string;
  especialidad?: string;
  numeroCedula?: string;
  telefono?:     string;
}

/** Respuesta de /login y /register */
export interface AuthResponse {
  message:      string;
  user:         User;
  accessToken:  string;
  refreshToken: string;
}

/** Error de validación devuelto con HTTP 422 */
export interface FieldError {
  field:   string;
  message: string;
}
