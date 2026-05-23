'use client';
// app/dashboard/reportes/page.tsx — Derma Copilot

import { useEffect, useState, useCallback } from 'react';
import Link                                 from 'next/link';
import { Navbar }         from '../../../components/Navbar';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { Button }         from '../../../components/ui/Button';
import {
  listarReportes,
  descargarPdf,
  enviarReporte,
}                         from '../../../lib/reportes';
import { ApiError }       from '../../../lib/api';
import type { ReporteListItem } from '../../../types/reportes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fechaRelativa(iso: string): { corta: string; completa: string } {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const dias = Math.floor(diff / 86_400_000);
  let corta: string;
  if (dias === 0)      corta = 'Hoy';
  else if (dias === 1) corta = 'Ayer';
  else if (dias < 7)   corta = `Hace ${dias} días`;
  else corta = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
  return { corta, completa: d.toLocaleString('es-ES') };
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 animate-pulse">
          <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-40" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-48" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-16" /></td>
          <td className="px-5 py-4"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
          <td className="px-5 py-4"><div className="h-8 bg-gray-200 rounded-lg w-32 ml-auto" /></td>
        </tr>
      ))}
    </tbody>
  );
}

// ── Modal: enviar reporte ─────────────────────────────────────────────────────

function ModalEnviar({
  reporte,
  onEnviar,
  onClose,
  loading,
}: {
  reporte:  ReporteListItem;
  onEnviar: (email: string, nombre: string) => void;
  onClose:  () => void;
  loading:  boolean;
}) {
  const [email,  setEmail]  = useState('');
  const [nombre, setNombre] = useState(reporte.pacienteNombre ?? '');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <span aria-hidden="true">📧</span> Enviar {reporte.folio}
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Se adjuntará el PDF automáticamente al correo.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Nombre del paciente
            </label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="paciente@email.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button onClick={() => onEnviar(email, nombre)} loading={loading}
            disabled={!email.includes('@')} className="flex-1">
            📤 Enviar
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ReportesListPage() {
  const [reportes,     setReportes]     = useState<ReporteListItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroEnv,    setFiltroEnv]    = useState<'todos' | 'enviado' | 'no_enviado'>('todos');
  const [descargando,  setDescargando]  = useState<string | null>(null);  // reporteId
  const [modalReporte, setModalReporte] = useState<ReporteListItem | null>(null);
  const [enviando,     setEnviando]     = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Cargar ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    listarReportes()
      .then(setReportes)
      .catch(e => setError(e instanceof ApiError ? e.message : 'Error al cargar reportes.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Descargar PDF ─────────────────────────────────────────────────────────────

  const handleDescargar = useCallback(async (r: ReporteListItem) => {
    setDescargando(r.id);
    try {
      await descargarPdf(r.id, `${r.folio}.pdf`);
      showToast(`📥 ${r.folio} descargado correctamente.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al descargar PDF.');
    } finally {
      setDescargando(null);
    }
  }, []);

  // ── Enviar email ──────────────────────────────────────────────────────────────

  async function handleEnviar(email: string, nombre: string) {
    if (!modalReporte) return;
    setEnviando(true);
    try {
      await enviarReporte(modalReporte.id, { emailDestino: email, nombrePaciente: nombre });
      setReportes(prev =>
        prev.map(r => r.id === modalReporte.id ? { ...r, enviado: true, emailEnviado: email } : r));
      setModalReporte(null);
      showToast(`📧 ${modalReporte.folio} enviado a ${email}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al enviar.');
    } finally {
      setEnviando(false);
    }
  }

  // ── Filtrar ───────────────────────────────────────────────────────────────────

  const filtrados = reportes.filter(r => {
    const q      = busqueda.toLowerCase();
    const matchQ = !q ||
      r.pacienteNombre.toLowerCase().includes(q) ||
      r.folio.toLowerCase().includes(q) ||
      r.diagnosticoPrincipal.toLowerCase().includes(q);
    const matchE =
      filtroEnv === 'todos' ||
      (filtroEnv === 'enviado'    && r.enviado) ||
      (filtroEnv === 'no_enviado' && !r.enviado);
    return matchQ && matchE;
  });

  const countEnviados    = reportes.filter(r => r.enviado).length;
  const countNoEnviados  = reportes.filter(r => !r.enviado).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Toast */}
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                          bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        )}

        {/* Modal enviar */}
        {modalReporte && (
          <ModalEnviar
            reporte={modalReporte}
            onEnviar={handleEnviar}
            onClose={() => setModalReporte(null)}
            loading={enviando}
          />
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reportes clínicos</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading
                  ? 'Cargando…'
                  : `${reportes.length} reportes · ${countEnviados} enviados`}
              </p>
            </div>
            <Link href="/dashboard/casos/nuevo">
              <Button variant="secondary">🔬 Nuevo análisis</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total generados', value: reportes.length,  color: 'bg-blue-50   text-blue-700'  },
              { label: 'Enviados',        value: countEnviados,    color: 'bg-green-50  text-green-700' },
              { label: 'Por enviar',      value: countNoEnviados,  color: 'bg-orange-50 text-orange-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl px-4 py-3`}>
                <p className="text-2xl font-bold">{loading ? '—' : value}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700
                            text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span>⚠️</span> {error}
              <button className="ml-auto text-red-400 hover:text-red-600"
                onClick={() => setError(null)}>✕</button>
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
                  placeholder="Buscar por folio, paciente o diagnóstico..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filtroEnv}
                onChange={e => setFiltroEnv(e.target.value as typeof filtroEnv)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="enviado">Enviados</option>
                <option value="no_enviado">Por enviar</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Folio','Paciente','Diagnóstico principal','Fecha','Estado','Acciones'].map(h => (
                      <th key={h}
                          className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
                          <div className="text-5xl mb-3">📋</div>
                          <p className="text-gray-600 font-medium">
                            {busqueda || filtroEnv !== 'todos'
                              ? 'Sin resultados para esa búsqueda'
                              : 'No hay reportes generados aún'}
                          </p>
                          {!busqueda && filtroEnv === 'todos' && (
                            <p className="text-gray-400 text-xs mt-1">
                              Genera un análisis de caso y luego crea su reporte PDF
                            </p>
                          )}
                        </td>
                      </tr>
                    ) : filtrados.map(r => {
                      const { corta, completa } = fechaRelativa(r.createdAt);
                      const isDesc = descargando === r.id;

                      return (
                        <tr key={r.id}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors">

                          {/* Folio */}
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-bold text-blue-700
                                             bg-blue-50 px-2.5 py-1 rounded-lg">
                              {r.folio}
                            </span>
                          </td>

                          {/* Paciente */}
                          <td className="px-5 py-4">
                            {r.pacienteNombre ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                                                flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {r.pacienteNombre[0]?.toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-800">{r.pacienteNombre}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">Sin nombre</span>
                            )}
                          </td>

                          {/* Diagnóstico */}
                          <td className="px-5 py-4 max-w-[220px]">
                            <p className="text-gray-700 truncate">
                              {r.diagnosticoPrincipal || <span className="text-gray-400">—</span>}
                            </p>
                          </td>

                          {/* Fecha */}
                          <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap"
                              title={completa}>
                            {corta}
                          </td>

                          {/* Estado enviado */}
                          <td className="px-5 py-4">
                            {r.enviado ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1
                                               bg-green-100 text-green-700 rounded-full text-xs font-semibold"
                                    title={r.emailEnviado ? `Enviado a: ${r.emailEnviado}` : 'Enviado'}>
                                ✅ Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1
                                               bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                                📭 Pendiente
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1 flex-wrap">
                              <Link href={`/dashboard/casos/${r.casoId}/reporte`}>
                                <button className="text-xs text-gray-600 hover:text-gray-800 font-medium
                                                    px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                        title="Ver y editar reporte">
                                  👁️ Ver
                                </button>
                              </Link>

                              <button
                                onClick={() => handleDescargar(r)}
                                disabled={isDesc}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium
                                           px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Descargar PDF"
                              >
                                {isDesc ? '⏳' : '📥'} PDF
                              </button>

                              <button
                                onClick={() => setModalReporte(r)}
                                className="text-xs text-gray-600 hover:text-gray-800 font-medium
                                           px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Enviar al paciente"
                              >
                                📧
                              </button>
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
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between
                              text-xs text-gray-400">
                <span>Mostrando {filtrados.length} de {reportes.length} reportes</span>
                {countNoEnviados > 0 && (
                  <span className="text-orange-500 font-medium">
                    {countNoEnviados} pendiente{countNoEnviados > 1 ? 's' : ''} de envío
                  </span>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
