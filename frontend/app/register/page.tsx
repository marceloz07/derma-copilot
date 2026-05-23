'use client';
// app/register/page.tsx — Derma Copilot Frontend
import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth }   from '../../hooks/useAuth';
import { ApiError }  from '../../lib/api';
import { Button }    from '../../components/ui/Button';
import { Input }     from '../../components/ui/Input';

// ── Reglas de contraseña (client-side) ────────────────────────────────────────
interface PasswordRule { label: string; test: (p: string) => boolean }
const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Al menos 8 caracteres', test: p => p.length >= 8 },
  { label: 'Una letra mayúscula',   test: p => /[A-Z]/.test(p) },
  { label: 'Un número',             test: p => /[0-9]/.test(p) },
];

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FormState {
  nombre:       string;
  apellido:     string;
  email:        string;
  password:     string;
  especialidad: string;
}

// Mapa field → mensaje de error (de validación backend 422 o client-side)
type FieldErrors = Partial<Record<keyof FormState, string>>;

// ── Componente ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    nombre:       '',
    apellido:     '',
    email:        '',
    password:     '',
    especialidad: '',
  });

  // Error general (409 email duplicado, 500, red caída)
  const [globalError,  setGlobalError]  = useState<string | null>(null);
  // Errores por campo (422 o client-side)
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({});
  const [loading,      setLoading]      = useState(false);
  const [showPwRules,  setShowPwRules]  = useState(false);

  // Si ya está autenticado, ir al dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, router]);

  // ── Cambio de campo ─────────────────────────────────────────────────────────
  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      // Limpiar el error de este campo y el error global al editar
      setGlobalError(null);
      setFieldErrors(prev => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    // 1 ── Validación client-side de campos requeridos
    const clientErrors: FieldErrors = {};
    if (!form.nombre.trim())  clientErrors.nombre  = 'El nombre es requerido.';
    if (!form.email.trim())   clientErrors.email   = 'El correo es requerido.';
    if (!form.password)       clientErrors.password = 'La contraseña es requerida.';

    // 2 ── Validación de reglas de contraseña
    if (form.password && !clientErrors.password) {
      const failing = PASSWORD_RULES.filter(r => !r.test(form.password));
      if (failing.length > 0) {
        clientErrors.password = `${failing[0].label}.`;
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    // 3 ── Petición al backend: POST /api/auth/register
    setLoading(true);
    try {
      await register({
        email:        form.email.trim(),
        password:     form.password,
        nombre:       form.nombre.trim(),
        apellido:     form.apellido.trim()     || undefined,
        especialidad: form.especialidad.trim() || undefined,
      });
      // register() redirige a /dashboard al tener éxito — no se llega al finally
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.fields && err.fields.length > 0) {
          // ── Errores de validación campo a campo (422) ──────────────────────
          // El backend devuelve: { error: "Datos inválidos", fields: [{field, message}] }
          // Los mapeamos al campo correcto del formulario para mostrarlos inline.
          const mapped: FieldErrors = {};
          for (const { field, message } of err.fields) {
            if (field in form) {
              mapped[field as keyof FormState] = message;
            }
          }
          // Si algún field no coincidió con un campo del form, mostrar banner general
          const unmapped = err.fields.filter(f => !(f.field in form));
          if (unmapped.length > 0) {
            setGlobalError(unmapped.map(f => f.message).join(' · '));
          }
          setFieldErrors(mapped);
        } else {
          // 409 correo duplicado, 500, etc. → banner general
          setGlobalError(err.message);
        }
      } else {
        setGlobalError('No se pudo conectar con el servidor. ¿Está activo en localhost:3001?');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" aria-hidden="true">🩺</div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">
            Regístrate para empezar a usar Derma Copilot
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={handleChange('nombre')}
              placeholder="Ana"
              autoComplete="given-name"
              error={fieldErrors.nombre}
              required
            />
            <Input
              label="Apellido"
              value={form.apellido}
              onChange={handleChange('apellido')}
              placeholder="García"
              autoComplete="family-name"
              error={fieldErrors.apellido}
            />
          </div>

          {/* Email */}
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="doctor@clinica.com"
            autoComplete="email"
            error={fieldErrors.email}
            required
          />

          {/* Contraseña */}
          <div>
            <Input
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              onFocus={() => setShowPwRules(true)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              error={fieldErrors.password}
              required
            />

            {/* Indicador de reglas — aparece al enfocar el campo */}
            {showPwRules && form.password.length > 0 && (
              <ul className="mt-2 space-y-1" aria-label="Requisitos de contraseña">
                {PASSWORD_RULES.map(rule => {
                  const ok = rule.test(form.password);
                  return (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-xs transition-colors
                        ${ok ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Especialidad — opcional */}
          <Input
            label="Especialidad"
            value={form.especialidad}
            onChange={handleChange('especialidad')}
            placeholder="Dermatología"
            hint="Opcional — por defecto: Dermatología"
            error={fieldErrors.especialidad}
          />

          {/* Error general (no es de un campo específico) */}
          {globalError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200
                         text-red-700 px-4 py-3 rounded-lg text-sm"
            >
              <span className="shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
              <span>{globalError}</span>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Crear cuenta
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
