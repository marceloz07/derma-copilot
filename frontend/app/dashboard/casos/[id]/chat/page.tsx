'use client';
// app/dashboard/casos/[id]/chat/page.tsx — Derma Copilot
// Chat asistente clínico con IA en tiempo real (SSE streaming).

import {
  useCallback, useEffect, useRef, useState,
  type FormEvent, type KeyboardEvent,
} from 'react';
import Link              from 'next/link';
import { useParams }     from 'next/navigation';
import { Navbar }         from '../../../../../components/Navbar';
import { ProtectedRoute } from '../../../../../components/ProtectedRoute';
import { Button }         from '../../../../../components/ui/Button';
import {
  enviarMensajeStream,
  obtenerSugerencias,
  obtenerHistorial,
  guardarConsulta,
  generarReporte,
}                        from '../../../../../lib/consultas';
import { ApiError }       from '../../../../../lib/api';
import type {
  ContextoCaso,
  MensajeChat,
} from '../../../../../types/consultas';

// ── Hook: debounce ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Burbuja de mensaje ────────────────────────────────────────────────────────

function BurbujaMensaje({
  msg, isStreaming,
}: { msg: MensajeChat; isStreaming?: boolean }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar asistente */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center
                        text-white text-sm shrink-0 mt-1" aria-hidden="true">
          🤖
        </div>
      )}

      <div className={`max-w-[80%] group`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm'
          }`}>
          {msg.contenido}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Sugerencias clínicas del asistente */}
        {!isUser && msg.sugerencias && msg.sugerencias.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-400 font-medium px-1">💡 Preguntas sugeridas</p>
            {msg.sugerencias.map((s, i) => (
              <div key={i}
                className="text-xs text-blue-700 bg-blue-50 border border-blue-100
                           px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors
                           cursor-default select-text leading-snug">
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Tokens usados */}
        {!isUser && msg.tokensUsados && (
          <p className="text-xs text-gray-300 mt-1 px-1">
            {msg.tokensUsados.toLocaleString()} tokens
          </p>
        )}
      </div>

      {/* Avatar usuario */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center
                        text-gray-600 text-sm shrink-0 mt-1" aria-hidden="true">
          👨‍⚕️
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center
                      text-white text-sm shrink-0">🤖</div>
      <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span key={i}
              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Panel lateral: contexto del caso ─────────────────────────────────────────

function PanelContexto({
  contexto, casoId, totalTokens, guardada,
  onGuardar, onReporte, guardandoLoading, reporteLoading,
}: {
  contexto?:       ContextoCaso;
  casoId:          string;
  totalTokens:     number;
  guardada:        boolean;
  onGuardar:       () => void;
  onReporte:       () => void;
  guardandoLoading: boolean;
  reporteLoading:  boolean;
}) {
  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4">

      {/* Contexto del caso */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">📋</span> Contexto del caso
        </h3>

        {contexto ? (
          <div className="space-y-2 text-xs text-gray-600">
            <div>
              <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">
                Síntomas
              </p>
              <p className="leading-relaxed line-clamp-4">{contexto.sintomas}</p>
            </div>

            {contexto.diagnosticos && contexto.diagnosticos.length > 0 && (
              <div>
                <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">
                  Diagnósticos previos
                </p>
                <div className="flex flex-wrap gap-1">
                  {contexto.diagnosticos.map((d, i) => (
                    <span key={i}
                      className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {contexto.urgencia && (
              <div>
                <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">
                  Urgencia
                </p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold
                  ${contexto.urgencia === 'Urgente' ? 'bg-red-100 text-red-700' :
                    contexto.urgencia === 'Alta'    ? 'bg-orange-100 text-orange-700' :
                    contexto.urgencia === 'Media'   ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-green-100 text-green-700'}`}>
                  {contexto.urgencia}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Sin contexto de análisis previo.
          </p>
        )}

        <p className="mt-3 text-[10px] text-gray-300">
          ID: {casoId.slice(0, 8)}…
        </p>
      </div>

      {/* Token counter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <span aria-hidden="true">⚡</span> Tokens de sesión
        </h3>
        <p className="text-2xl font-bold text-gray-900">
          {totalTokens.toLocaleString()}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          ≈ ${((totalTokens / 1_000_000) * 0.25).toFixed(4)} USD
          <span className="ml-1 text-gray-300">(Haiku)</span>
        </p>
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        <Button
          onClick={onGuardar}
          loading={guardandoLoading}
          disabled={guardada}
          variant={guardada ? 'secondary' : 'primary'}
          className="w-full"
          size="sm"
        >
          {guardada ? '✅ Consulta guardada' : '💾 Guardar consulta'}
        </Button>

        <Button
          onClick={onReporte}
          loading={reporteLoading}
          variant="secondary"
          className="w-full"
          size="sm"
        >
          📄 Ver resumen IA
        </Button>

        <Link href={`/dashboard/casos/${casoId}/reporte`} className="block">
          <Button variant="primary" className="w-full" size="sm">
            📋 Generar reporte PDF
          </Button>
        </Link>

        <Link href="/dashboard">
          <Button variant="ghost" className="w-full" size="sm">
            ← Dashboard
          </Button>
        </Link>
      </div>
    </aside>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ChatCasoPage() {
  const params = useParams<{ id: string }>();
  const casoId = params.id;

  // Estado del chat
  const [mensajes,      setMensajes]      = useState<MensajeChat[]>([]);
  const [inputTexto,    setInputTexto]    = useState('');
  const [streaming,     setStreaming]     = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [contexto,      setContexto]      = useState<ContextoCaso | undefined>();
  const [totalTokens,   setTotalTokens]   = useState(0);
  const [guardada,      setGuardada]      = useState(false);
  const [sugerencias,   setSugerencias]   = useState<string[]>([]);
  const [sugsLoading,   setSugsLoading]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [guardandoLoading, setGuardandoLoading] = useState(false);
  const [reporteLoading,   setReporteLoading]   = useState(false);
  const [reporteTexto,     setReporteTexto]      = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const debouncedInput = useDebounce(inputTexto, 400);

  // ── Cargar historial al montar ───────────────────────────────────────────

  useEffect(() => {
    if (!casoId) return;
    obtenerHistorial(casoId).then(sesion => {
      if (!sesion) return;
      setMensajes(sesion.mensajes);
      setTotalTokens(sesion.totalTokens);
      setGuardada(sesion.guardada);
    }).catch(() => {/* sin historial previo, ok */});

    // Intentar cargar contexto del caso desde la API de casos
    fetch(`/api/casos/${casoId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('derma_access_token') ?? ''}`,
      },
    })
      .then(r => r.ok ? r.json() as Promise<{ caso: { sintomas: string; analisis: { diagnosticoDiferencial: Array<{ condicion: string }>; urgencia: string } } }> : null)
      .then(data => {
        if (!data?.caso) return;
        setContexto({
          sintomas:      data.caso.sintomas,
          diagnosticos:  data.caso.analisis.diagnosticoDiferencial.map(d => d.condicion),
          urgencia:      data.caso.analisis.urgencia,
        });
      })
      .catch(() => {/* caso no encontrado o backend caído */});
  }, [casoId]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, streamingText]);

  // ── Sugerencias mientras escribe ─────────────────────────────────────────

  useEffect(() => {
    if (!debouncedInput || debouncedInput.trim().length < 5 || streaming) {
      setSugerencias([]);
      return;
    }
    setSugsLoading(true);
    obtenerSugerencias(debouncedInput, contexto?.sintomas)
      .then(sugs => setSugerencias(sugs))
      .finally(() => setSugsLoading(false));
  }, [debouncedInput, contexto?.sintomas, streaming]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────

  const handleEnviar = useCallback(async (textoOverride?: string) => {
    const texto = (textoOverride ?? inputTexto).trim();
    if (!texto || streaming) return;

    setError(null);
    setSugerencias([]);
    setInputTexto('');
    setStreaming(true);
    setStreamingText('');

    // Añadir mensaje del usuario optimísticamente
    const msgUsuario: MensajeChat = {
      id:        `tmp-${Date.now()}`,
      role:      'user',
      contenido: texto,
      timestamp: new Date().toISOString(),
    };
    setMensajes(prev => [...prev, msgUsuario]);

    let textoAcumulado = '';

    try {
      await enviarMensajeStream(
        { casoId, mensaje: texto, contextoCaso: contexto },
        // onDelta
        (chunk) => {
          textoAcumulado += chunk;
          setStreamingText(textoAcumulado);
        },
        // onDone
        (ev) => {
          // Reemplazar el texto en stream por el mensaje final persistido
          const msgAsistente: MensajeChat = {
            id:          ev.mensajeId,
            role:        'assistant',
            contenido:   textoAcumulado,
            sugerencias: ev.sugerencias,
            tokensUsados: ev.tokensUsados,
            timestamp:   new Date().toISOString(),
          };
          setMensajes(prev => [...prev, msgAsistente]);
          setTotalTokens(ev.totalTokensSesion);
          setStreamingText('');
          setStreaming(false);
        },
        // onError
        (errMsg) => {
          setError(errMsg);
          setStreamingText('');
          setStreaming(false);
        },
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión con el servidor.');
      setStreamingText('');
      setStreaming(false);
    }
  }, [casoId, contexto, inputTexto, streaming]);

  // ── Enter para enviar (Shift+Enter = nueva línea) ─────────────────────────

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  }

  // ── Guardar consulta ──────────────────────────────────────────────────────

  async function handleGuardar() {
    setGuardandoLoading(true);
    try {
      await guardarConsulta(casoId);
      setGuardada(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar.');
    } finally {
      setGuardandoLoading(false);
    }
  }

  // ── Generar reporte ───────────────────────────────────────────────────────

  async function handleReporte() {
    setReporteLoading(true);
    setReporteTexto(null);
    try {
      const md = await generarReporte(casoId);
      setReporteTexto(md);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al generar reporte.');
    } finally {
      setReporteLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex gap-6">

          {/* ── Panel lateral ──────────────────────────────────────────── */}
          <PanelContexto
            contexto={contexto}
            casoId={casoId}
            totalTokens={totalTokens}
            guardada={guardada}
            onGuardar={handleGuardar}
            onReporte={handleReporte}
            guardandoLoading={guardandoLoading}
            reporteLoading={reporteLoading}
          />

          {/* ── Chat principal ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100
                          shadow-sm overflow-hidden min-h-[calc(100vh-10rem)]">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span aria-hidden="true">🩺</span>
                  Consulta asistida por IA
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Describe hallazgos clínicos · Haiku streaming
                </p>
              </div>
              <Link href={`/dashboard/casos/nuevo`}>
                <Button variant="ghost" size="sm">Nuevo análisis</Button>
              </Link>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Mensaje de bienvenida si no hay historial */}
              {mensajes.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="text-5xl mb-4" aria-hidden="true">🩺</div>
                  <h2 className="text-lg font-semibold text-gray-700">
                    Asistente dermatológico listo
                  </h2>
                  <p className="text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">
                    Describe los hallazgos clínicos de tu paciente y recibirás
                    análisis diferencial, preguntas guía y plan de manejo en tiempo real.
                  </p>
                  {/* Preguntas de inicio rápido */}
                  <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                    {[
                      'Paciente con lesión eritematosa pruriginosa en antebrazo',
                      'Placa hiperpigmentada de bordes irregulares en espalda',
                      'Pápulas foliculares en cara con comedones abiertos',
                      'Vesículas agrupadas en dermátomo torácico',
                    ].map(starter => (
                      <button
                        key={starter}
                        onClick={() => handleEnviar(starter)}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-100
                                   px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors
                                   text-left"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de mensajes */}
              {mensajes.map(msg => (
                <BurbujaMensaje key={msg.id} msg={msg} />
              ))}

              {/* Mensaje en streaming */}
              {streaming && streamingText && (
                <BurbujaMensaje
                  msg={{
                    id: 'streaming',
                    role: 'assistant',
                    contenido: streamingText,
                    timestamp: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}

              {/* Typing indicator (antes de que llegue el primer token) */}
              {streaming && !streamingText && <TypingIndicator />}

              {/* Error banner */}
              {error && (
                <div role="alert"
                  className="flex items-start gap-2 bg-red-50 border border-red-200
                             text-red-700 px-4 py-3 rounded-xl text-sm">
                  <span className="shrink-0">⚠️</span>
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-600 shrink-0"
                  >×</button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-100 p-4">

              {/* Sugerencias de autocompletado */}
              {(sugerencias.length > 0 || sugsLoading) && !streaming && (
                <div className="mb-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-gray-400 shrink-0">
                    {sugsLoading ? '⏳' : '💡'}
                  </span>
                  {sugsLoading ? (
                    <span className="text-xs text-gray-300 italic">Generando sugerencias…</span>
                  ) : (
                    sugerencias.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInputTexto(prev =>
                          prev.trim() ? `${prev.trim()} ${s}` : s
                        )}
                        className="text-xs bg-gray-50 text-gray-600 border border-gray-200
                                   px-2.5 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-700
                                   hover:border-blue-200 transition-colors"
                      >
                        {s}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Textarea + Enviar */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputTexto}
                    onChange={e => setInputTexto(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={streaming}
                    placeholder="Describe los hallazgos clínicos… (Enter para enviar, Shift+Enter para nueva línea)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               disabled:bg-gray-50 disabled:text-gray-400 leading-relaxed"
                  />
                  <span className={`absolute bottom-2 right-3 text-xs
                    ${inputTexto.length > 1800 ? 'text-orange-500' : 'text-gray-300'}`}>
                    {inputTexto.length}/2000
                  </span>
                </div>

                <Button
                  onClick={() => handleEnviar()}
                  loading={streaming}
                  disabled={!inputTexto.trim() || streaming}
                  className="shrink-0 h-[76px] px-5"
                >
                  {streaming ? '…' : '↑ Enviar'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal de reporte ──────────────────────────────────────────────── */}
        {reporteTexto && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setReporteTexto(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh]
                         flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">📄 Reporte clínico</h2>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([reporteTexto], { type: 'text/markdown' });
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement('a');
                      a.href = url;
                      a.download = `reporte-caso-${casoId.slice(0, 8)}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    ⬇ Descargar .md
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReporteTexto(null)}
                  >
                    ✕ Cerrar
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                  {reporteTexto}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
