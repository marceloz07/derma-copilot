'use client';
// app/dashboard/casos/nuevo/page.tsx — Derma Copilot
// Módulo de análisis de casos dermatológicos con IA.

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar }         from '../../../../components/Navbar';
import { ProtectedRoute } from '../../../../components/ProtectedRoute';
import { Button }         from '../../../../components/ui/Button';
import { Dropzone }       from '../../../../components/ui/Dropzone';
import { casosApi, fileToBase64 } from '../../../../lib/casos';
import { ApiError }               from '../../../../lib/api';
import type {
  AnalisisDermatologico,
  DiagnosticoDiferencial,
  Urgencia,
} from '../../../../types/casos';

// ── Colores según urgencia / probabilidad ──────────────────────────────────────

const URGENCIA_STYLES: Record<Urgencia, string> = {
  Baja:     'bg-green-100  text-green-700  border-green-200',
  Media:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  Alta:     'bg-orange-100 text-orange-700 border-orange-200',
  Urgente:  'bg-red-100    text-red-700    border-red-200',
};

const URGENCIA_ICON: Record<Urgencia, string> = {
  Baja: '🟢', Media: '🟡', Alta: '🟠', Urgente: '🔴',
};

const PROB_STYLES: Record<DiagnosticoDiferencial['probabilidad'], string> = {
  Alta:  'bg-red-100    text-red-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Baja:  'bg-blue-100   text-blue-700',
};

// ── Sub-componentes de resultados ─────────────────────────────────────────────

function SectionCard({
  icon, title, children, className = '',
}: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span aria-hidden="true">{icon}</span>
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Analizando...">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
        </div>
      ))}
    </div>
  );
}

function ResultadosPanel({ analisis, casoId }: { analisis: AnalisisDermatologico; casoId: string }) {
  return (
    <div className="space-y-4">

      {/* Urgencia banner */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border font-medium
          ${URGENCIA_STYLES[analisis.urgencia]}`}>
        <span className="text-lg" aria-hidden="true">{URGENCIA_ICON[analisis.urgencia]}</span>
        <div>
          <span className="text-sm font-semibold">Urgencia: {analisis.urgencia}</span>
          <p className="text-xs font-normal opacity-80">Caso guardado · ID: {casoId.slice(0, 8)}</p>
        </div>
      </div>

      {/* Diagnóstico diferencial */}
      <SectionCard icon="🔬" title="Diagnóstico Diferencial">
        <div className="space-y-3">
          {analisis.diagnosticoDiferencial.map((dx, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold
                              flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{dx.condicion}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROB_STYLES[dx.probabilidad]}`}>
                    {dx.probabilidad}
                  </span>
                  {dx.codigoCIE && (
                    <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {dx.codigoCIE}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{dx.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Recomendaciones */}
      <SectionCard icon="📋" title="Recomendaciones Clínicas">
        <ul className="space-y-2">
          {analisis.recomendaciones.map((rec, i) => (
            <li key={i} className="flex gap-2 items-start text-sm text-gray-700">
              <span className="shrink-0 text-blue-500 mt-0.5">✓</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Presupuesto + Sesiones (grid 2 col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <SectionCard icon="💰" title="Presupuesto Estimado">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              ${analisis.presupuestoEstimado.min.toLocaleString()}
              <span className="text-gray-400 font-normal text-lg">–</span>
              ${analisis.presupuestoEstimado.max.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">{analisis.presupuestoEstimado.moneda}</p>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              {analisis.presupuestoEstimado.descripcion}
            </p>
          </div>
        </SectionCard>

        <SectionCard icon="🗓️" title="Sesiones Necesarias">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {analisis.sesionesNecesarias.cantidad}
              <span className="text-sm font-normal text-gray-500 ml-1">sesiones</span>
            </p>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {analisis.sesionesNecesarias.frecuencia}
            </p>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              {analisis.sesionesNecesarias.descripcion}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Notas adicionales */}
      {analisis.notasAdicionales && (
        <SectionCard icon="📝" title="Notas Adicionales">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {analisis.notasAdicionales}
          </p>
        </SectionCard>
      )}

      {/* CTA principal: Continuar en chat */}
      <Link href={`/dashboard/casos/${casoId}/chat`} className="block">
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl
                        bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                        hover:from-blue-700 hover:to-indigo-700 transition-all
                        shadow-md hover:shadow-lg cursor-pointer group">
          <div>
            <p className="font-semibold text-sm">Continuar con el asistente IA</p>
            <p className="text-xs text-blue-100 mt-0.5">
              Consulta en tiempo real con contexto del análisis ya cargado
            </p>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition-transform" aria-hidden="true">
            💬 →
          </span>
        </div>
      </Link>

      {/* Acciones secundarias */}
      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
        >
          🖨️ Imprimir reporte
        </Button>
        <Link href="/dashboard/casos/nuevo">
          <Button variant="secondary" size="sm">
            ➕ Nuevo análisis
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            ← Volver al dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function NuevoCasoPage() {
  const router = useRouter();

  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [sintomas,    setSintomas]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [analisis,    setAnalisis]    = useState<AnalisisDermatologico | null>(null);
  const [casoId,      setCasoId]      = useState<string | null>(null);
  const resultRef                     = useRef<HTMLDivElement>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleFileSelect(file: File) {
    setImageFile(file);
    setError(null);
  }

  function handleFileClear() {
    setImageFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sintomas.trim()) {
      setError('Describe los síntomas del paciente antes de analizar.');
      return;
    }
    if (sintomas.trim().length < 10) {
      setError('Los síntomas deben tener al menos 10 caracteres.');
      return;
    }

    setLoading(true);
    setAnalisis(null);

    try {
      let imagenBase64: string | undefined;
      let mimeType:     string | undefined;

      if (imageFile) {
        imagenBase64 = await fileToBase64(imageFile);
        mimeType     = imageFile.type;
      }

      const result = await casosApi.analizar({ sintomas: sintomas.trim(), imagenBase64, mimeType });

      setAnalisis(result.analisis);
      setCasoId(result.casoId);

      // Scroll suave a los resultados
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo conectar con el servidor. ¿Está activo en localhost:3001?');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Casos</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Nuevo análisis</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span aria-hidden="true">🔬</span> Análisis con IA
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Sube una foto y describe los síntomas para obtener un diagnóstico diferencial.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ── Columna izquierda: Formulario ─────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Dropzone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto de la lesión
                      <span className="ml-1 text-xs text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <Dropzone
                      onFileSelect={handleFileSelect}
                      onFileClear={handleFileClear}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Sin foto, el análisis se basará solo en síntomas.
                    </p>
                  </div>

                  {/* Síntomas */}
                  <div>
                    <label
                      htmlFor="sintomas"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Síntomas y descripción clínica
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <textarea
                      id="sintomas"
                      value={sintomas}
                      onChange={e => { setSintomas(e.target.value); setError(null); }}
                      disabled={loading}
                      placeholder="Ej: Lesión eritematosa en antebrazo derecho de 3 semanas de evolución, con prurito intenso nocturno. El paciente refiere piel seca y antecedentes de rinitis alérgica..."
                      rows={6}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none
                        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                        disabled:bg-gray-50 disabled:text-gray-400
                        ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">Mínimo 10 caracteres</span>
                      <span className={`text-xs ${sintomas.length > 1800 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {sintomas.length}/2000
                      </span>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 bg-red-50 border border-red-200
                                 text-red-700 px-3 py-2.5 rounded-lg text-sm"
                    >
                      <span className="shrink-0">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Analizando con IA…' : '🤖 Analizar con IA'}
                  </Button>

                  {loading && (
                    <p className="text-center text-xs text-gray-400 -mt-1">
                      Claude Vision está procesando la imagen…
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* ── Columna derecha: Resultados ──────────────────────────── */}
            <div className="lg:col-span-3" ref={resultRef}>

              {/* Estado inicial */}
              {!loading && !analisis && (
                <div className="flex flex-col items-center justify-center h-80 text-center
                                bg-white rounded-2xl border border-dashed border-gray-200 p-8">
                  <div className="text-5xl mb-4" aria-hidden="true">🩺</div>
                  <h2 className="text-lg font-semibold text-gray-700">
                    Los resultados aparecerán aquí
                  </h2>
                  <p className="text-sm text-gray-400 mt-2 max-w-xs leading-relaxed">
                    Sube una foto de la lesión y describe los síntomas para que Claude
                    genere el diagnóstico diferencial.
                  </p>
                  <div className="mt-5 text-left space-y-1.5 text-xs text-gray-400">
                    {['Diagnóstico diferencial (2–4 condiciones)', 'Recomendaciones clínicas', 'Presupuesto estimado', 'Plan de sesiones'].map(item => (
                      <div key={item} className="flex items-center gap-1.5">
                        <span className="text-gray-300">◦</span> {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && <LoadingSkeleton />}

              {/* Resultados */}
              {!loading && analisis && casoId && (
                <ResultadosPanel analisis={analisis} casoId={casoId} />
              )}
            </div>
          </div>

          {/* Disclaimer legal */}
          <div className="mt-10 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-xs text-blue-700">
            <strong>⚕️ Aviso importante:</strong> Este módulo es una herramienta de apoyo clínico
            desarrollada para asistir al profesional médico. Los resultados de la IA{' '}
            <strong>no constituyen un diagnóstico médico definitivo</strong> y deben ser evaluados
            e interpretados por un dermatólogo certificado. No reemplaza la consulta médica presencial.
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
