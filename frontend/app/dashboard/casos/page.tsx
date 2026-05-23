'use client';
// app/dashboard/casos/page.tsx — Derma Copilot

import { useEffect, useState } from 'react';
import Link                    from 'next/link';
import { useRouter }           from 'next/navigation';
import { Navbar }              from '../../../components/Navbar';
import { ProtectedRoute }      from '../../../components/ProtectedRoute';
import { Button }              from '../../../components/ui/Button';
import { casosApi }            from '../../../lib/casos';
import { ApiError }            from '../../../lib/api';
import type { CasoListItem, Urgencia } from '../../../types/casos';

// ── Helpers ───────────────────────────────────────────────────────────────────

const URGENCIA_BADGE: Record<Urgencia, string> = {
  Baja:     'bg-green-100  text-green-700',
  Media:    'bg-yellow-100 text-yellow-700',
  Alta:     'bg-orange-100 text-orange-700',
  Urgente:  'bg-red-100    text-red-700',
};

const URGENCIA_DOT: Record<Urgencia, string> = {
  Baja: 'bg-green-500', Media: 'bg-yellow-500', Alta: 'bg-orange-500', Urgente: 'bg-red-500',
};

function fechaRelativa(iso: string): { corta: string; completa: string } {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const dias = Math.floor(diff / 86_400_000);
  let corta: string;
  if (dias === 0) corta = 'Hoy';
  else if (dias === 1) corta = 'Ayer';
  else if (dias < 7) corta = `Hace ${dias} días`;
  else corta = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  return { corta, completa: d.toLocaleString('es-ES') };
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 animate-pulse">
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-24" /></td>
          <td className="px-5 py-4">
            <div className="h-3.5 bg-gray-200 rounded w-64 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-40" />
          </td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-48" /></td>
          <td className="px-5 py-4"><div className="h-6 bg-gray-200 rounded-full w-16" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-16" /></td>
          <td className="px-5 py-4"><div className="h-8 bg-gray-200 rounded-lg w-28 ml-auto" /></td>
        </tr>
      ))}
    </tbody>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CasosListPage() {
  const router = useRouter();

  const [casos,      setCasos]      = useState<CasoListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroUrg,  setFiltroUrg]  = useState<Urgencia | 'todos'>('todos');

  useEffect(() => {
    casosApi.listar()
      .then(d => setCasos(d.casos))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Error al cargar casos.'))
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const countUrg: Record<string, number> = { Baja: 0, Media: 0, Alta: 0, Urgente: 0 };
  casos.forEach(c => { countUrg[c.analisis.urgencia] = (countUrg[c.analisis.urgencia] ?? 0) + 1; });

  // Filter
  const filtrados = casos.filter(c => {
    const q  = busqueda.toLowerCase();
    const dx = c.analisis.diagnosticoDiferencial[0]?.condicion ?? '';
    const matchQ = !q || c.sintomas.toLowerCase().includes(q) || dx.toLowerCase().includes(q);
    const matchU = filtroUrg === 'todos' || c.analisis.urgencia === filtroUrg;
    return matchQ && matchU;
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Casos clínicos</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Cargando…' : `${casos.length} casos · ${countUrg['Urgente'] ?? 0} urgentes`}
              </p>
            </div>
            <Link href="/dashboard/casos/nuevo">
              <Button>🔬 Nuevo análisis</Button>
            </Link>
          </div>

          {/* Urgencia stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(['Baja','Media','Alta','Urgente'] as Urgencia[]).map(u => (
              <button
                key={u}
                onClick={() => setFiltroUrg(prev => prev === u ? 'todos' : u)}
                className={`rounded-xl px-4 py-3 text-left transition-all border-2
                  ${filtroUrg === u ? 'border-current shadow-sm scale-[1.02]' : 'border-transparent'}
                  ${URGENCIA_BADGE[u]}`}
              >
                <p className="text-2xl font-bold">{loading ? '—' : countUrg[u] ?? 0}</p>
                <p className="text-xs font-semibold mt-0.5">{u}</p>
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700
                            text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por síntomas o diagnóstico..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filtroUrg}
                onChange={e => setFiltroUrg(e.target.value as typeof filtroUrg)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Toda urgencia</option>
                <option value="Urgente">Urgente</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['ID', 'Síntomas / Descripción', 'Diagnóstico principal', 'Urgencia', 'Fecha', 'Acciones'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                {loading ? <TableSkeleton /> : (
                  <tbody>
                    {filtrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-20 text-center">
                          <div className="text-5xl mb-3">🔬</div>
                          <p className="text-gray-600 font-medium">
                            {busqueda || filtroUrg !== 'todos'
                              ? 'Sin casos para esa búsqueda'
                              : 'No hay casos registrados aún'}
                          </p>
                          {!busqueda && filtroUrg === 'todos' && (
                            <Link href="/dashboard/casos/nuevo">
                              <button className="mt-3 text-sm text-blue-600 hover:underline">
                                Crear primer análisis →
                              </button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ) : filtrados.map(c => {
                      const dx  = c.analisis.diagnosticoDiferencial[0];
                      const urg = c.analisis.urgencia;
                      const { corta, completa } = fechaRelativa(c.createdAt);
                      const folio = `#${c.id.slice(0, 6).toUpperCase()}`;

                      return (
                        <tr key={c.id}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/casos/${c.id}/chat`)}>

                          {/* ID */}
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs text-gray-500 bg-gray-100
                                             px-2 py-0.5 rounded font-semibold">
                              {folio}
                            </span>
                          </td>

                          {/* Síntomas */}
                          <td className="px-5 py-4 max-w-xs">
                            <p className="text-gray-800 font-medium truncate">
                              {c.sintomas.length > 70
                                ? c.sintomas.slice(0, 70) + '…'
                                : c.sintomas}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.analisis.diagnosticoDiferencial.length} diagnósticos diferenciales
                            </p>
                          </td>

                          {/* Diagnóstico */}
                          <td className="px-5 py-4 max-w-[200px]">
                            {dx ? (
                              <div>
                                <p className="font-medium text-gray-800 truncate">{dx.condicion}</p>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                                  ${dx.probabilidad === 'Alta'  ? 'bg-red-50 text-red-600' :
                                    dx.probabilidad === 'Media' ? 'bg-yellow-50 text-yellow-600' :
                                                                   'bg-blue-50 text-blue-600'}`}>
                                  {dx.probabilidad}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Urgencia */}
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                              rounded-full text-xs font-semibold ${URGENCIA_BADGE[urg]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${URGENCIA_DOT[urg]}`} />
                              {urg}
                            </span>
                          </td>

                          {/* Fecha */}
                          <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap"
                              title={completa}>
                            {corta}
                          </td>

                          {/* Acciones */}
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Link href={`/dashboard/casos/${c.id}/chat`}>
                                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium
                                                    px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                        title="Abrir chat">
                                  💬 Chat
                                </button>
                              </Link>
                              <Link href={`/dashboard/casos/${c.id}/reporte`}>
                                <button className="text-xs text-gray-600 hover:text-gray-800 font-medium
                                                    px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                        title="Generar reporte">
                                  📋 Reporte
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>

            {!loading && filtrados.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                Mostrando {filtrados.length} de {casos.length} casos
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
