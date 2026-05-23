'use client';
// app/dashboard/casos/[id]/reporte/page.tsx — Derma Copilot
// Generador y visor de reportes clínicos dermatológicos.

import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import Link          from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar }         from '../../../../../components/Navbar';
import { ProtectedRoute } from '../../../../../components/ProtectedRoute';
import { Button }         from '../../../../../components/ui/Button';
import {
  generarReporte,
  actualizarReporte,
  descargarPdf,
  enviarReporte,
}                    from '../../../../../lib/reportes';
import { ApiError }   from '../../../../../lib/api';
import type {
  DatosEditables,
  Medicamento,
} from '../../../../../types/reportes';

// ── Estado inicial vacío ──────────────────────────────────────────────────────

const DATOS_VACÍOS: DatosEditables = {
  pacienteNombre:          '',
  pacienteEmail:           '',
  pacienteEdad:            '',
  diagnosticoPrincipal:    '',
  diagnosticosSecundarios: [],
  hallazgosClinica:        '',
  planTratamiento:         '',
  medicamentos:            [],
  recomendaciones:         [],
  seguimiento:             '',
  notasMedico:             '',
};

const MED_VACIO: Medicamento = {
  nombre: '', dosis: '', frecuencia: '', duracion: '', instrucciones: '',
};

// ── Componente: campo de texto editable ───────────────────────────────────────

function Campo({
  label, value, onChange, multiline = false, placeholder = '',
  hint,
}: {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  multiline?:   boolean;
  placeholder?: string;
  hint?:        string;
}) {
  const base = `w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm
                text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent transition-colors hover:border-gray-300
                placeholder:text-gray-400`;
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Componente: tabla de medicamentos ─────────────────────────────────────────

function TablaMedicamentos({
  medicamentos,
  onChange,
}: {
  medicamentos: Medicamento[];
  onChange:     (meds: Medicamento[]) => void;
}) {
  function update(i: number, field: keyof Medicamento, val: string) {
    const next = [...medicamentos];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  function remove(i: number) {
    onChange(medicamentos.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...medicamentos, { ...MED_VACIO }]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Medicamentos prescritos
        </label>
        <button
          type="button"
          onClick={add}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          ＋ Agregar
        </button>
      </div>

      {medicamentos.length === 0 ? (
        <div
          className="border border-dashed border-gray-200 rounded-lg p-4
                     text-center text-xs text-gray-400"
        >
          Sin medicamentos · haz clic en &quot;Agregar&quot;
        </div>
      ) : (
        <div className="space-y-2">
          {medicamentos.map((m, i) => (
            <div
              key={i}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Med. {i + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕ Quitar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre"
                  value={m.nombre}
                  onChange={e => update(i, 'nombre', e.target.value)}
                />
                <input
                  className="px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Dosis"
                  value={m.dosis}
                  onChange={e => update(i, 'dosis', e.target.value)}
                />
                <input
                  className="px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Frecuencia"
                  value={m.frecuencia}
                  onChange={e => update(i, 'frecuencia', e.target.value)}
                />
                <input
                  className="px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Duración"
                  value={m.duracion}
                  onChange={e => update(i, 'duracion', e.target.value)}
                />
              </div>
              <input
                className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Instrucciones especiales (opcional)"
                value={m.instrucciones ?? ''}
                onChange={e => update(i, 'instrucciones', e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente: lista de strings editable ─────────────────────────────────────

function ListaEditable({
  label, items, onChange, placeholder,
}: {
  label:       string;
  items:       string[];
  onChange:    (items: string[]) => void;
  placeholder?: string;
}) {
  function update(i: number, v: string) {
    const next = [...items];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, '']);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </label>
        <button
          type="button"
          onClick={add}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          ＋ Agregar
        </button>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="flex-1 px-2 py-1.5 rounded border border-gray-200 text-xs
                         focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={item}
              onChange={e => update(i, e.target.value)}
              placeholder={placeholder ?? 'Ítem...'}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-gray-400 hover:text-red-500 px-1"
            >
              ✕
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-gray-400 italic">Sin ítems</p>
        )}
      </div>
    </div>
  );
}

// ── Modal: enviar a paciente ──────────────────────────────────────────────────

function ModalEnviar({
  pacienteNombre,
  onEnviar,
  onClose,
  loading,
}: {
  pacienteNombre: string;
  onEnviar:       (email: string, nombre: string) => void;
  onClose:        () => void;
  loading:        boolean;
}) {
  const [email,  setEmail]  = useState('');
  const [nombre, setNombre] = useState(pacienteNombre);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <span aria-hidden="true">📧</span> Enviar reporte al paciente
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          El PDF del reporte se adjuntará automáticamente al email.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Nombre del paciente
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Email del paciente <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="paciente@email.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => onEnviar(email, nombre)}
            loading={loading}
            disabled={!email.includes('@')}
            className="flex-1"
          >
            📤 Enviar reporte
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ReportePage() {
  const params  = useParams<{ id: string }>();
  const casoId  = params.id;

  const [reporteId,    setReporteId]    = useState<string | null>(null);
  const [htmlPreview,  setHtmlPreview]  = useState<string>('');
  const [datos,        setDatos]        = useState<DatosEditables>(DATOS_VACÍOS);
  const [loading,      setLoading]      = useState(true);
  const [regenerando,  setRegenerando]  = useState(false);
  const [cooldown,     setCooldown]     = useState(false);
  const [descargando,  setDescargando]  = useState(false);
  const [enviando,     setEnviando]     = useState(false);
  const [modalEnviar,  setModalEnviar]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  /** Bloquea botones de generar/regenerar 2 s para evitar clicks múltiples. */
  function activarCooldown() {
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
  }

  // ── Generar reporte inicial ──────────────────────────────────────────────────

  useEffect(() => {
    if (!casoId) return;
    setLoading(true);
    setError(null);

    generarReporte(casoId)
      .then(resp => {
        setReporteId(resp.reporteId);
        setHtmlPreview(resp.htmlPreview);
        setDatos(resp.datosEditables);
        activarCooldown();
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Error al generar el reporte.');
      })
      .finally(() => setLoading(false));
  }, [casoId]);

  // ── Setter helpers ───────────────────────────────────────────────────────────

  function set<K extends keyof DatosEditables>(key: K, val: DatosEditables[K]) {
    setDatos(prev => ({ ...prev, [key]: val }));
  }

  // ── Regenerar PDF con datos actualizados ────────────────────────────────────

  const handleRegenerar = useCallback(async () => {
    if (!reporteId || cooldown) return;
    setRegenerando(true);
    setError(null);
    try {
      const resp = await actualizarReporte(reporteId, datos);
      setHtmlPreview(resp.htmlPreview);
      showToast('✅ Reporte actualizado correctamente.');
      activarCooldown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al actualizar reporte.');
    } finally {
      setRegenerando(false);
    }
  }, [reporteId, datos, cooldown]);

  // ── Descargar PDF ────────────────────────────────────────────────────────────

  async function handleDescargar() {
    if (!reporteId) return;
    setDescargando(true);
    try {
      await descargarPdf(reporteId, `reporte-${casoId.slice(0, 8)}.pdf`);
      showToast('📥 PDF descargado correctamente.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al descargar PDF.');
    } finally {
      setDescargando(false);
    }
  }

  // ── Enviar por email ─────────────────────────────────────────────────────────

  async function handleEnviar(emailDestino: string, nombrePaciente: string) {
    if (!reporteId) return;
    setEnviando(true);
    try {
      await enviarReporte(reporteId, { emailDestino, nombrePaciente });
      setModalEnviar(false);
      showToast(`📧 Reporte enviado a ${emailDestino}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al enviar reporte.');
    } finally {
      setEnviando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Toast */}
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                          bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg
                          animate-fade-in">
            {toast}
          </div>
        )}

        {/* Modal enviar */}
        {modalEnviar && (
          <ModalEnviar
            pacienteNombre={datos.pacienteNombre}
            onEnviar={handleEnviar}
            onClose={() => setModalEnviar(false)}
            loading={enviando}
          />
        )}

        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Breadcrumb + acciones */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <nav className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
              <span>/</span>
              <Link href={`/dashboard/casos/${casoId}/chat`} className="hover:text-blue-600">Chat</Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">Reporte</span>
            </nav>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerar}
                loading={regenerando}
                disabled={!reporteId || loading || regenerando || cooldown}
              >
                🔄 Regenerar PDF
              </Button>
              <Button
                size="sm"
                onClick={handleDescargar}
                loading={descargando}
                disabled={!reporteId || loading}
              >
                📥 Descargar PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalEnviar(true)}
                disabled={!reporteId || loading}
              >
                📧 Enviar a paciente
              </Button>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span aria-hidden="true">📄</span> Reporte Clínico
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Edita los campos y haz clic en &quot;Regenerar PDF&quot; para actualizar la vista previa.
            </p>
          </div>

          {/* Error global */}
          {error && (
            <div role="alert"
              className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200
                         text-red-700 px-4 py-3 rounded-xl text-sm">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
              <button className="ml-auto text-red-400 hover:text-red-600"
                onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent
                              rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Generando reporte con IA…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">

              {/* ── PANEL IZQUIERDO: formulario editable ──────────────── */}
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                                p-5 space-y-5">

                  {/* Datos paciente */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                      <span aria-hidden="true">👤</span> Datos del Paciente
                    </h2>
                    <div className="space-y-3">
                      <Campo
                        label="Nombre completo"
                        value={datos.pacienteNombre}
                        onChange={v => set('pacienteNombre', v)}
                        placeholder="Ej: María García López"
                      />
                      <Campo
                        label="Email del paciente"
                        value={datos.pacienteEmail}
                        onChange={v => set('pacienteEmail', v)}
                        placeholder="paciente@email.com"
                      />
                      <Campo
                        label="Edad / Género"
                        value={datos.pacienteEdad}
                        onChange={v => set('pacienteEdad', v)}
                        placeholder="Ej: 34 años, Femenino"
                      />
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Diagnóstico */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                      <span aria-hidden="true">🔬</span> Diagnóstico
                    </h2>
                    <div className="space-y-3">
                      <Campo
                        label="Diagnóstico principal"
                        value={datos.diagnosticoPrincipal}
                        onChange={v => set('diagnosticoPrincipal', v)}
                        placeholder="Ej: Psoriasis en placas"
                      />
                      <ListaEditable
                        label="Diagnósticos secundarios / diferenciales"
                        items={datos.diagnosticosSecundarios}
                        onChange={v => set('diagnosticosSecundarios', v)}
                        placeholder="Ej: Dermatitis atópica"
                      />
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Hallazgos */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                      <span aria-hidden="true">📋</span> Hallazgos Clínicos
                    </h2>
                    <Campo
                      label="Descripción de hallazgos"
                      value={datos.hallazgosClinica}
                      onChange={v => set('hallazgosClinica', v)}
                      multiline
                      placeholder="Describe los hallazgos clínicos observados..."
                    />
                  </div>

                  <hr className="border-gray-100" />

                  {/* Plan + medicamentos */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                      <span aria-hidden="true">💊</span> Plan y Medicamentos
                    </h2>
                    <div className="space-y-4">
                      <Campo
                        label="Plan de tratamiento"
                        value={datos.planTratamiento}
                        onChange={v => set('planTratamiento', v)}
                        multiline
                        placeholder="Describe el plan de tratamiento..."
                      />
                      <TablaMedicamentos
                        medicamentos={datos.medicamentos}
                        onChange={v => set('medicamentos', v)}
                      />
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Recomendaciones */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                      <span aria-hidden="true">✅</span> Recomendaciones
                    </h2>
                    <ListaEditable
                      label="Recomendaciones clínicas"
                      items={datos.recomendaciones}
                      onChange={v => set('recomendaciones', v)}
                      placeholder="Ej: Evitar exposición solar directa"
                    />
                  </div>

                  <hr className="border-gray-100" />

                  {/* Seguimiento + notas */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <span aria-hidden="true">🗓️</span> Seguimiento y Notas
                    </h2>
                    <Campo
                      label="Plan de seguimiento"
                      value={datos.seguimiento}
                      onChange={v => set('seguimiento', v)}
                      placeholder="Ej: Control en 4 semanas para evaluar respuesta..."
                    />
                    <Campo
                      label="Notas del médico"
                      value={datos.notasMedico}
                      onChange={v => set('notasMedico', v)}
                      multiline
                      placeholder="Observaciones adicionales del especialista..."
                    />
                  </div>
                </div>

                {/* Botón regenerar (también al fondo del panel) */}
                <Button
                  onClick={handleRegenerar}
                  loading={regenerando}
                  disabled={!reporteId || regenerando || cooldown}
                  className="w-full"
                >
                  {cooldown ? '⏳ Espera un momento…' : '🔄 Regenerar vista previa'}
                </Button>

                {/* Acciones secundarias */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleDescargar}
                    loading={descargando}
                    disabled={!reporteId}
                    size="sm"
                  >
                    📥 Descargar PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setModalEnviar(true)}
                    disabled={!reporteId}
                    size="sm"
                  >
                    📧 Enviar
                  </Button>
                </div>

                <Link href={`/dashboard/casos/${casoId}/chat`}>
                  <Button variant="ghost" className="w-full" size="sm">
                    ← Volver al chat
                  </Button>
                </Link>
              </div>

              {/* ── PANEL DERECHO: vista previa HTML ──────────────────── */}
              <div className="relative">
                <div className="sticky top-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <span aria-hidden="true">👁️</span> Vista previa del reporte
                    </h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {regenerando ? 'Actualizando…' : 'En vivo'}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                                  overflow-hidden"
                       style={{ height: 'calc(100vh - 160px)' }}>
                    {htmlPreview ? (
                      <iframe
                        ref={iframeRef}
                        srcDoc={htmlPreview}
                        title="Vista previa del reporte clínico"
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-5xl mb-4">📄</div>
                          <p className="text-gray-400 text-sm">Cargando vista previa…</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Print button */}
                  <button
                    type="button"
                    onClick={() => {
                      const iframe = iframeRef.current;
                      if (iframe?.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                      }
                    }}
                    className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600
                               text-center py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    🖨️ Imprimir vista previa
                  </button>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
