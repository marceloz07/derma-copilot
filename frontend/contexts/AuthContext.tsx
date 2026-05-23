'use client';
// ─────────────────────────────────────────────────────────────────────────────
// contexts/AuthContext.tsx — Derma Copilot Frontend
//
// Estado global de autenticación.
// Envuelve la app desde app/layout.tsx vía <Providers>.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, authApi } from '../lib/api';
import { clearTokens, isTokenValid, setTokens } from '../lib/auth';
import type { LoginCredentials, RegisterData, User } from '../types/auth';

// ── Shape del contexto ────────────────────────────────────────────────────────

interface AuthContextValue {
  user:            User | null;
  loading:         boolean;
  error:           string | null;
  isAuthenticated: boolean;
  login:           (credentials: LoginCredentials) => Promise<void>;
  register:        (data: RegisterData) => Promise<void>;
  logout:          () => void;
  clearError:      () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);      // true hasta restaurar sesión
  const [error,   setError]   = useState<string | null>(null);

  // ── Restaurar sesión al cargar la app ──────────────────────────────────────
  useEffect(() => {
    if (!isTokenValid()) {
      // Token ausente o expirado — no hay sesión que restaurar
      clearTokens();
      setLoading(false);
      return;
    }

    // Token válido — verificar contra el backend para obtener datos frescos
    authApi.me()
      .then(({ user: fetchedUser }) => setUser(fetchedUser))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login(credentials);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : 'Error de conexión. ¿Está el servidor activo en localhost:3001?';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.register(data);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : 'Error de conexión. ¿Está el servidor activo en localhost:3001?';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
