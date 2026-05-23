'use client';
// app/dashboard/pacientes/page.tsx — Derma Copilot

import { useEffect, useState } from 'react';
import Link                    from 'next/link';
import { Navbar }              from '../../../components/Navbar';
import { ProtectedRoute }      from '../../../components/ProtectedRoute';
import { Button }              from '../../../components/ui/Button';
import { pacientesApi }        from '../../../lib/pacientes';
import { ApiError }            from '../../../lib/api';
import type {
  Paciente,
  CrearPacienteData,
  GeneroPaciente,
} from '../../../types/pacientes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fechaRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d    = Math.floor(diff / 86_400_000);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 30)  return `Hace ${d} días`;
  const m = Math.floor(d / 30);
  return `Hace ${m} mes${m > 1 ? 'es' : ''}`;
}

function calcularEdad(fNac?: string): string {
  if (!fNac) return '—';
  const hoy  = new Date();
  const nac  = new Date(fNac);
  const años = hoy.getFullYear() - nac.getFullYear();
  const ajuste =
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
      ? 1 : 0;
  return `${años - ajuste} años`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 animate-pulse">
          {[40, 56, 36, 28, 20, 20].map((w, j) => (
            <td key={j} className="px-5 py-4">
              <div className={`h-3.5 bg-gray-200 rounded w-${w}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ── Modal: nuevo paciente ─────────────────────────────────────────────────────

const FORM_VACIO: CrearPacienteData = {
  nombre: '', apellido: '', email: '', telefono: '',
  fechaNacimiento: '', genero: undefined, notas: '',
};

function ModalNuevoPaciente({
  onCrear,
  onClose,
  loading,
  error,
}: {
  onCrear:  (data: CrearPacienteData) => void;
  onClose:  () => void;
  loading:  boolean;
  error:    string | null;
}) {
  const [form, setForm] = useState<CrearPacienteData>(FORM_VACIO);

  function set(k: keyof CrearPacienteData, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const inputCls = `w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  const labelCls = `block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo paciente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.nombre}
                onChange={e => set('nombre', e.target.value)} placeholder="Ej: Ana" />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input className={inputCls} value={form.apellido ?? ''}
                onChange={e => set('apellido', e.target.value)} placeholder="Ej: García López" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={form.email ?? ''}
              onChange={e => set('email', e.target.value)} placeholder="paciente@email.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={form.telefono ?? ''}
                onChange={e => set('telefono', e.target.value)} placeholder="+52 55 0000 0000" />
            </div>
            <div>
              <label className={labelCls}>Fecha nacimiento</label>
              <input className={inputCls} type="date" value={form.fechaNacimiento ?? ''}
                onChange={e => set('fechaNacimiento', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Género</label>
            <select className={inputCls} value={form.genero ?? ''}
              onChange={e => set('genero', e.target.value as GeneroPaciente)}>
              <option value="">Seleccionar...</option>
              <option>Masculino</option>
              <option>Femenino</option>
              <option>Otro</option>
              <option>No especificado</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Notas clínicas</label>
            <textarea className={`${inputCls} resize-none`} rows={3}
              value={form.notas ?? ''}
              onChange={e => set('notas', e.target.value)}
              placeholder="Antecedentes, alergias, observaciones..." />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <Button onClick={() => onCrear(form)} loading={loading}
            disabled={!form.nombre.trim()} className="flex-1">
            Guardar paciente
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [busqueda,  setBusqueda]  = useState('');
  const [filtroEst, setFiltroEst] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [modal,     setModal]     = useState(false);
  const [creando,   setCreando]   = useState(false);
  const [errorModal,setErrorModal]= useState<string | null>(null);

  // ── Cargar ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    pacientesApi.listar()
      .then(d => setPacientes(d.pacientes))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Error al cargar pacientes.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Crear paciente ───────────────────────────────────────────────────────────

  async function handleCrear(data: CrearPacienteData) {
    setCreando(true);
    setErrorModal(null);
    try {
      const resp = await pacientesApi.crear(data);
      setPacientes(prev => [resp.paciente, ...prev]);
      setModal(false);
    } catch (e) {
      setErrorModal(e instanceof ApiError ? e.message : 'Error al crear paciente.');
    } finally {
      setCreando(false);
    }
  }

  // ── Cambiar estado ────────────────────────────────────────────────────────────

  async function toggleEstado(p: Paciente) {
    const nuevoEstado = p.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      const resp = await pacientesApi.actualizar(p.id, { estado: nuevoEstado });
      setPacientes(prev => prev.map(x => x.id === p.id ? resp.paciente : x));
    } catch { /* silenciar */ }
  }

  // ── Filtrar ──────────────────────────────────────────────────────────────────

  const filtrados = pacientes.filter(p => {
    const q = busqueda.toLowerCase();
    const matchBusqueda =
      !q ||
      `${p.nombre} ${p.apellido ?? ''}`.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.telefono ?? '').includes(q);
    const matchEstado = filtroEst === 'todos' || p.estado === filtroEst;
    return matchBusqueda && matchEstado;
  });

  const countActivos   = pacientes.filter(p => p.estado === 'activo').length;
  const countInactivos = pacientes.filter(p => p.estado === 'inactivo').length;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {modal && (
          <ModalNuevoPaciente
            onCrear={handleCrear}
            onClose={() => { setModal(false); setErrorModal(null); }}
            loading={creando}
            error={errorModal}
          />
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Cargando…' : `${pacientes.length} registrados · ${countActivos} activos · ${countInactivos} inactivos`}
              </p>
            </div>
            <Button onClick={() => setModal(true)}>
              ＋ Nuevo paciente
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total',     value: pacientes.length,  color: 'bg-blue-50  text-blue-700'  },
              { label: 'Activos',   value: countActivos,      color: 'bg-green-50 text-green-700' },
              { label: 'Inactivos', value: countInactivos,    color: 'bg-gray-50  text-gray-700'  },
              { label: 'Este mes',  value: pacientes.filter(p => {
                const d = new Date(p.createdAt);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length,           color: 'bg-purple-50 text-purple-700' },
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
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filtroEst}
                onChange={e => setFiltroEst(e.target.value as typeof filtroEst)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Paciente
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Contacto
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Edad
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Registro
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Acciones
                    </th>
                  </tr>
                </thead>

                {loading ? <TableSkeleton /> : (
                  <tbody>
                    {filtrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-20 text-center">
                          <div className="text-5xl mb-3">👤</div>
                          <p className="text-gray-600 font-medium">
                            {busqueda || filtroEst !== 'todos'
                              ? 'Sin resultados para esa búsqueda'
                              : 'No hay pacientes registrados aún'}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {!busqueda && filtroEst === 'todos' &&
                              'Haz clic en "Nuevo paciente" para agregar el primero'}
                          </p>
                        </td>
                      </tr>
                    ) : filtrados.map(p => (
                      <tr key={p.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors">

                        {/* Nombre */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                                            flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {p.nombre[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {p.nombre} {p.apellido ?? ''}
                              </p>
                              {p.genero && (
                                <p className="text-xs text-gray-400">{p.genero}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contacto */}
                        <td className="px-5 py-4">
                          <p className="text-gray-700">{p.email || '—'}</p>
                          <p className="text-xs text-gray-400">{p.telefono || ''}</p>
                        </td>

                        {/* Edad */}
                        <td className="px-5 py-4 text-gray-600">
                          {calcularEdad(p.fechaNacimiento)}
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleEstado(p)}
                            title="Clic para cambiar estado"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                              text-xs font-semibold cursor-pointer transition-opacity hover:opacity-75
                              ${p.estado === 'activo'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full
                              ${p.estado === 'activo' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {p.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>

                        {/* Registro */}
                        <td className="px-5 py-4 text-gray-500 text-xs"
                            title={new Date(p.createdAt).toLocaleString('es-ES')}>
                          {fechaRelativa(p.createdAt)}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href="/dashboard/casos/nuevo">
                              <button className="text-xs text-blue-600 hover:text-blue-800
                                                  font-medium px-2.5 py-1.5 rounded-lg
                                                  hover:bg-blue-50 transition-colors">
                                ＋ Caso
                              </button>
                            </Link>
                            {p.notas && (
                              <span title={p.notas}
                                className="text-xs text-gray-400 cursor-help px-1.5">
                                📝
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            {/* Footer */}
            {!loading && filtrados.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                Mostrando {filtrados.length} de {pacientes.length} pacientes
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
