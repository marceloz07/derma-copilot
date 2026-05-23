'use client';
// app/dashboard/page.tsx — Derma Copilot Frontend
import { useState, useEffect } from 'react';
import Link                    from 'next/link';
import { Navbar }              from '../../components/Navbar';
import { ProtectedRoute }      from '../../components/ProtectedRoute';
import { Card }                from '../../components/ui/Card';
import { Button }              from '../../components/ui/Button';
import { useAuth }             from '../../hooks/useAuth';
import { pacientesApi }        from '../../lib/pacientes';
import { listarReportes }      from '../../lib/reportes';
import type { Paciente }       from '../../types/pacientes';
import type { ReporteListItem } from '../../types/reportes';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  activo:       'bg-green-100 text-green-700',
  Activo:       'bg-green-100 text-green-700',
  nuevo:        'bg-blue-100 text-blue-700',
  Nuevo:        'bg-blue-100 text-blue-700',
  seguimiento:  'bg-yellow-100 text-yellow-700',
  Seguimiento:  'bg-yellow-100 text-yellow-700',
  inactivo:     'bg-gray-100 text-gray-500',
  Inactivo:     'bg-gray-100 text-gray-500',
  cerrado:      'bg-gray-100 text-gray-500',
  Cerrado:      'bg-gray-100 text-gray-500',
};

function fmtRelDate(iso: string): string {
  const d     = new Date(iso);
  const now   = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  const time  = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Hoy, ${time}`;
  if (diffDays === 1) return `Ayer, ${time}`;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const QUICK_ACTIONS = [
  { label: 'Nuevo paciente',     icon: '➕', href: '/dashboard/pacientes' },
  { label: 'Analizar caso',      icon: '🔬', href: '/dashboard/casos/nuevo' },
  { label: 'Generar reporte',    icon: '📄', href: '/dashboard/reportes' },
  { label: 'Asesor Comercial',   icon: '💼', href: '/dashboard/negocio' },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [reportes,  setReportes]  = useState<ReporteListItem[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [pacs, reps] = await Promise.allSettled([
          pacientesApi.listar(),
          listarReportes(),
        ]);

        if (cancelled) return;

        if (pacs.status === 'fulfilled') {
          setPacientes(pacs.value.pacientes ?? []);
        }

        if (reps.status === 'fulfilled') {
          setReportes(reps.value);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAll();
    return () => { cancelled = true; };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Stats dinámicos ─────────────────────────────────────────────────────────
  const STATS = [
    {
      label: 'Pacientes totales',
      value: loading ? '—' : String(pacientes.length),
      trend: 0,
      icon:  '👥',
    },
    {
      label: 'Casos analizados',
      value: loading ? '—' : String(reportes.length),
      trend: 0,
      icon:  '📋',
    },
    {
      label: 'Reportes generados',
      value: loading ? '—' : String(reportes.length),
      trend: 0,
      icon:  '📄',
    },
    {
      label: 'Plan',
      value: user?.planSuscripcion ?? 'Free',
      trend: 0,
      icon:  '⭐',
    },
  ];

  // ── Pacientes recientes (últimos 4 por updatedAt desc) ──────────────────────
  const recentPacientes = [...pacientes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Encabezado ─────────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, Dr. {user?.nombre} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
          </div>

          {/* ── Stats ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {STATS.map(s => (
              <Card key={s.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {s.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                      {s.value}
                    </p>
                    {s.trend !== 0 && (
                      <p className={`text-xs mt-1 font-medium ${s.trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {s.trend > 0 ? '↑' : '↓'} {Math.abs(s.trend)}% este mes
                      </p>
                    )}
                  </div>
                  <span className="text-2xl" aria-hidden="true">{s.icon}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* ── Acciones rápidas ───────────────────────────────────────────── */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Acciones rápidas
            </h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(a => (
                <Link key={a.label} href={a.href}>
                  <Button variant="secondary" size="sm">
                    <span aria-hidden="true">{a.icon}</span> {a.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Grid principal ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Pacientes recientes */}
            <div className="lg:col-span-2">
              <Card>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Pacientes recientes</h2>
                  <Link href="/dashboard/pacientes">
                    <Button variant="ghost" size="sm">Ver todos →</Button>
                  </Link>
                </div>

                {loading ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-400">
                    Cargando pacientes…
                  </div>
                ) : recentPacientes.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-3xl mb-2">👥</p>
                    <p className="text-sm text-gray-500">Aún no tienes pacientes registrados.</p>
                    <Link href="/dashboard/pacientes">
                      <Button variant="secondary" size="sm" className="mt-3">
                        Registrar primer paciente
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentPacientes.map(p => {
                      const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(' ');
                      const diagnostico    = p.notas?.trim() ? p.notas : 'Sin notas clínicas';
                      return (
                        <div
                          key={p.id}
                          className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                              {nombreCompleto[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{nombreCompleto}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[200px]">
                                {diagnostico}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-gray-400 hidden sm:block">
                              {fmtRelDate(p.updatedAt)}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                ESTADO_COLORS[p.estado] ?? 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {p.estado}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Panel de perfil */}
            <div className="flex flex-col gap-4">
              <Card className="p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Mi perfil</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                    {user?.nombre?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Dr. {user?.nombre}{user?.apellido ? ` ${user.apellido}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{user?.especialidad}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                  <InfoRow label="Email"  value={user?.email ?? '—'} />
                  <InfoRow label="Plan"   value={user?.planSuscripcion ?? '—'} capitalize />
                  <InfoRow label="Cuenta" value={user ? new Date(user.createdAt).toLocaleDateString('es-ES') : '—'} />
                </div>
                <Button variant="secondary" size="sm" className="w-full mt-4">
                  Editar perfil
                </Button>
              </Card>

              {/* Asistente IA teaser */}
              <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-0">
                <p className="text-lg" aria-hidden="true">🤖</p>
                <h3 className="font-semibold mt-2">Asistente IA</h3>
                <p className="text-xs text-blue-200 mt-1">
                  Analiza fotos de lesiones, genera reportes y responde consultas clínicas.
                </p>
                <Link href="/dashboard/casos/nuevo">
                  <Button variant="ghost" size="sm"
                    className="mt-3 bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    Empezar análisis →
                  </Button>
                </Link>
              </Card>

              {/* Resumen reportes recientes */}
              {!loading && reportes.length > 0 && (
                <Card className="p-5">
                  <h2 className="font-semibold text-gray-900 mb-3 text-sm">
                    Últimos reportes
                  </h2>
                  <div className="space-y-2">
                    {[...reportes]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 3)
                      .map(r => (
                        <div key={r.id} className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 mt-0.5 shrink-0">📄</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {r.pacienteNombre}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {r.diagnosticoPrincipal}
                            </p>
                          </div>
                          <span className="text-xs text-gray-300 ml-auto shrink-0">
                            {fmtRelDate(r.createdAt)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <Link href="/dashboard/reportes">
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                      Ver todos los reportes →
                    </Button>
                  </Link>
                </Card>
              )}
            </div>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// ── Sub-componente auxiliar ───────────────────────────────────────────────────
function InfoRow({
  label, value, capitalize = false,
}: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`text-gray-700 font-medium ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}
