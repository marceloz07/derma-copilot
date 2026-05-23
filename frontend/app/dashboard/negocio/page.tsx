'use client';
// app/dashboard/negocio/page.tsx — Derma Copilot
// Módulo Asesor Comercial: benchmarking de mercado, scripts educativos,
// paquetes personalizados y analytics de conversión + precios.

import { useCallback, useEffect, useState } from 'react';
import Link                                 from 'next/link';
import { Navbar }                           from '../../../components/Navbar';
import { ProtectedRoute }                   from '../../../components/ProtectedRoute';
import { Button }                           from '../../../components/ui/Button';
import { ApiError }                         from '../../../lib/api';
import {
  getCatalogo,
  getBenchmarking,
  registrarPrecio,
  getSugerencias,
  getScripts,
  listarPaquetes,
  crearPaquete,
  actualizarPaquete,
  registrarAceptacion,
  getAnalytics,
} from '../../../lib/negocio';
import type {
  ItemCatalogo,
  ResultadoBenchmarking,
  TipoPosicionamiento,
  PrecioRegistrado,
  ResumenBenchmarking,
  SugerenciaPaquete,
  ScriptVenta,
  PaquetePersonalizado,
  CrearPaqueteInput,
  AnalyticsPaquete,
  ResumenAnalytics,
  EstructuraPaquete,
  CategoriaScript,
} from '../../../types/negocio';

// ── Helpers de formato ────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Moneda ────────────────────────────────────────────────────────────────────

type CurrencyCode = 'USD' | 'COP' | 'MXN';

/** Tasas de conversión desde USD para el selector manual del benchmarking */
const CURRENCY_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  COP: 4200,
  MXN: 17.5,
};

/** Para la tabla de analytics: zona → moneda nativa (ARS/CLP/PEN muestran USD equiv.) */
const ZONA_MONEDA: Record<string, { code: string; rate: number }> = {
  'bogota':       { code: 'COP', rate: 4200  },
  'medellin':     { code: 'COP', rate: 4200  },
  'cali':         { code: 'COP', rate: 4200  },
  'cdmx':         { code: 'MXN', rate: 17.5  },
  'monterrey':    { code: 'MXN', rate: 17.5  },
  'buenos-aires': { code: 'USD', rate: 1     },
  'santiago':     { code: 'USD', rate: 1     },
  'lima':         { code: 'USD', rate: 1     },
  'latam':        { code: 'USD', rate: 1     },
};

/**
 * Convierte un valor en USD a moneda local y lo formatea.
 * COP → "es-CO" (punto como separador de miles)
 * MXN → "es-MX" (coma como separador de miles)
 * USD → "en-US"
 */
function fmtCurrency(usdVal: number, tasaCambio: number, code: string): string {
  const localVal = Math.round(usdVal * tasaCambio);
  if (code === 'COP') return '$' + localVal.toLocaleString('es-CO');
  if (code === 'MXN') return '$' + localVal.toLocaleString('es-MX');
  return '$' + localVal.toLocaleString('en-US');
}

/** Genera el texto del rango de un tier de posicionamiento en moneda local */
function rangoLabel(min: number, max: number | null, rate: number, code: string): string {
  if (max === null) return `Más de ${fmtCurrency(min, rate, code)}`;
  if (min === 0)    return `Hasta ${fmtCurrency(max, rate, code)}`;
  return `${fmtCurrency(min, rate, code)} – ${fmtCurrency(max, rate, code)}`;
}

// ── Helpers visuales — paquetes ───────────────────────────────────────────────

const TIPO_LABEL: Record<EstructuraPaquete, string> = {
  basico:   'Básico',
  estandar: 'Estándar',
  premium:  'Premium',
};

const TIPO_COLOR: Record<EstructuraPaquete, string> = {
  basico:   'bg-gray-100 text-gray-700 border-gray-200',
  estandar: 'bg-blue-100 text-blue-700 border-blue-200',
  premium:  'bg-purple-100 text-purple-700 border-purple-200',
};

const TIPO_RING: Record<EstructuraPaquete, string> = {
  basico:   'ring-gray-200',
  estandar: 'ring-blue-400',
  premium:  'ring-purple-400',
};

// ── Helpers visuales — posicionamiento ───────────────────────────────────────

const POS_LABEL: Record<TipoPosicionamiento, string> = {
  'economico':     'Económico',
  'promedio':      'Mercado',
  'premium':       'Premium',
  'ultra-premium': 'Ultra-Premium',
};

const POS_COLOR: Record<TipoPosicionamiento, string> = {
  'economico':     'bg-gray-100 text-gray-600 border-gray-200',
  'promedio':      'bg-blue-100 text-blue-700 border-blue-200',
  'premium':       'bg-purple-100 text-purple-700 border-purple-200',
  'ultra-premium': 'bg-amber-100 text-amber-700 border-amber-200',
};

const POS_ICON: Record<TipoPosicionamiento, string> = {
  'economico':     '💵',
  'promedio':      '⚖️',
  'premium':       '💎',
  'ultra-premium': '👑',
};

// Client-side posicionamiento preview (mirrors backend logic)
function detectarPos(precio: number, avg: number): TipoPosicionamiento {
  const r = precio / avg;
  if (r < 0.80) return 'economico';
  if (r < 1.20) return 'promedio';
  if (r < 1.80) return 'premium';
  return 'ultra-premium';
}

const CAT_LABEL: Record<CategoriaScript, string> = {
  educacion:   '📚 Educación',
  seguimiento: '🔄 Seguimiento',
  prevencion:  '🛡️ Prevención',
  estetico:    '✨ Estético',
};

const CAT_COLOR: Record<CategoriaScript, string> = {
  educacion:   'bg-blue-100 text-blue-700',
  seguimiento: 'bg-yellow-100 text-yellow-700',
  prevencion:  'bg-green-100 text-green-700',
  estetico:    'bg-pink-100 text-pink-700',
};

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                    bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Benchmarking de Mercado
// ─────────────────────────────────────────────────────────────────────────────

function TabBenchmarking({ onToast }: { onToast: (msg: string) => void }) {
  const [tratamientos, setTratamientos] = useState<ItemCatalogo[]>([]);
  const [zonas,        setZonas]        = useState<ItemCatalogo[]>([]);
  const [catLoading,   setCatLoading]   = useState(true);

  const [tratamiento, setTratamiento] = useState('');
  const [zona,        setZona]        = useState('');

  const [resultado,   setResultado]   = useState<ResultadoBenchmarking | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const [miPrecio,  setMiPrecio]  = useState('');
  const [guardando, setGuardando] = useState(false);
  const [notas,     setNotas]     = useState('');

  // Carga catálogo al montar
  useEffect(() => {
    getCatalogo()
      .then(d => { setTratamientos(d.tratamientos); setZonas(d.zonas); })
      .catch(() => { /* silencio */ })
      .finally(() => setCatLoading(false));
  }, []);

  // Auto-selección de moneda y precio pre-llenado cuando carga resultado
  useEffect(() => {
    if (!resultado) return;
    const code = resultado.codigoMoneda;
    const auto: CurrencyCode = code === 'COP' ? 'COP' : code === 'MXN' ? 'MXN' : 'USD';
    setCurrency(auto);
    setMiPrecio(String(Math.round(resultado.precios.promedio * CURRENCY_RATES[auto])));
  }, [resultado]);

  async function handleConsultar() {
    if (!tratamiento || !zona) return;
    setError(null);
    setConsultando(true);
    setResultado(null);
    setMiPrecio('');
    try {
      const r = await getBenchmarking(tratamiento, zona);
      setResultado(r);           // El useEffect de arriba se encarga de currency + miPrecio
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al consultar el mercado.');
    } finally {
      setConsultando(false);
    }
  }

  async function handleGuardar() {
    if (!resultado) return;
    const localAmt = parseFloat(miPrecio);
    if (!localAmt || localAmt <= 0) return;
    // Convertir a USD equivalente antes de guardar (el backend espera USD equiv.)
    const precioEnUSD = Math.round((localAmt / CURRENCY_RATES[currency]) * 100) / 100;
    setGuardando(true);
    try {
      await registrarPrecio({ tratamiento, zona, precioFinal: precioEnUSD, notas: notas.trim() || undefined });
      onToast('✅ Precio guardado en tu historial.');
      setNotas('');
    } catch (e) {
      onToast('⚠️ ' + (e instanceof ApiError ? e.message : 'Error al guardar precio.'));
    } finally {
      setGuardando(false);
    }
  }

  const selectedRate = CURRENCY_RATES[currency];
  const miPrecioNum  = parseFloat(miPrecio) || 0;
  // Comparar en la misma moneda (ratio es idéntico, pero usamos local para el diferencial)
  const avgLocal     = resultado ? resultado.precios.promedio * selectedRate : 0;
  const posPreview   = resultado && miPrecioNum > 0
    ? detectarPos(miPrecioNum, avgLocal)
    : null;

  function barPct(val: number, min: number, max: number) {
    if (max === min) return 50;
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  }

  const posCards = resultado
    ? [
        { tipo: 'economico'    as TipoPosicionamiento, key: 'economico',    data: resultado.posicionamientos.economico    },
        { tipo: 'promedio'     as TipoPosicionamiento, key: 'promedio',     data: resultado.posicionamientos.promedio     },
        { tipo: 'premium'      as TipoPosicionamiento, key: 'premium',      data: resultado.posicionamientos.premium      },
        { tipo: 'ultra-premium'as TipoPosicionamiento, key: 'ultraPremium', data: resultado.posicionamientos.ultraPremium },
      ]
    : [];

  if (catLoading) return (
    <div className="flex justify-center items-center h-40">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Selector ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Consultar rango de mercado</h2>
        <p className="text-xs text-gray-400 mb-5">
          Selecciona tratamiento, zona y moneda para ver qué cobran otros especialistas.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm
                          px-4 py-2.5 rounded-xl flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Tipo de tratamiento *
            </label>
            <select
              value={tratamiento}
              onChange={e => { setTratamiento(e.target.value); setResultado(null); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selecciona un tratamiento —</option>
              {tratamientos.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Zona geográfica *
            </label>
            <select
              value={zona}
              onChange={e => { setZona(e.target.value); setResultado(null); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selecciona tu zona —</option>
              {zonas.map(z => (
                <option key={z.id} value={z.id}>{z.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Selector de moneda ── */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Mostrar precios en
          </label>
          <div className="flex gap-2 flex-wrap">
            {(['USD', 'COP', 'MXN'] as CurrencyCode[]).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCurrency(c);
                  // Reescalar el precio ya ingresado al nuevo ratio
                  if (miPrecioNum > 0) {
                    const usdEquiv = miPrecioNum / selectedRate;
                    setMiPrecio(String(Math.round(usdEquiv * CURRENCY_RATES[c])));
                  }
                }}
                className={`px-4 py-1.5 rounded-lg border text-sm font-bold transition-all ${
                  currency === c
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                }`}
              >
                {c === 'COP' ? '🇨🇴 COP' : c === 'MXN' ? '🇲🇽 MXN' : '🌎 USD'}
              </button>
            ))}
            {resultado && (
              <span className="self-center text-xs text-gray-400 ml-1">
                {currency !== 'USD'
                  ? `(1 USD ≈ ${CURRENCY_RATES[currency].toLocaleString()} ${currency})`
                  : ''}
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={handleConsultar}
          loading={consultando}
          disabled={!tratamiento || !zona}
          className="mt-5 w-full sm:w-auto"
        >
          🗺️ Consultar mercado
        </Button>
      </div>

      {/* ── Resultado ── */}
      {resultado && (
        <div className="space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-gray-900">{resultado.tratamientoLabel}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {resultado.zonaLabel} · {resultado.unidad} · precios en {currency}
              </p>
            </div>
          </div>

          {/* Rango de precios — 3 columnas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Rango de mercado — {currency}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Mínimo',   val: resultado.precios.minimo,   color: 'text-gray-500',   bg: 'bg-gray-50  border-gray-200'  },
                { label: 'Promedio', val: resultado.precios.promedio, color: 'text-blue-700',   bg: 'bg-blue-50  border-blue-200'  },
                { label: 'Máximo',   val: resultado.precios.maximo,   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200'},
              ].map(c => (
                <div key={c.label} className={`rounded-xl border p-4 text-center ${c.bg}`}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
                  <p className={`text-xl font-black leading-tight ${c.color}`}>
                    {fmtCurrency(c.val, selectedRate, currency)}
                  </p>
                  {currency !== 'USD' && (
                    <p className="text-xs text-gray-300 mt-0.5">
                      ($ {c.val.toLocaleString('en-US')} USD)
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Barra visual — marcadores en unidades locales */}
            {(() => {
              const minLocal = resultado.precios.minimo  * selectedRate;
              const avgLocal2 = resultado.precios.promedio * selectedRate;
              const maxLocal = resultado.precios.maximo  * selectedRate;
              return (
                <>
                  <div className="relative h-6 mb-1">
                    <div className="absolute inset-y-2 left-0 right-0 bg-gray-200 rounded-full" />
                    <div className="absolute inset-y-2 bg-gradient-to-r from-gray-300 via-blue-400 to-purple-400 rounded-full left-0 right-0" />
                    {/* Marcador avg */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-600"
                      style={{ left: `${barPct(avgLocal2, minLocal, maxLocal)}%` }}
                    />
                    {/* Marcador del precio del doctor */}
                    {miPrecioNum > 0 && (
                      <div
                        className={`absolute top-0 bottom-0 w-3 h-3 rounded-full my-auto -translate-x-1/2 border-2 border-white ${
                          posPreview ? POS_COLOR[posPreview].split(' ')[0] : 'bg-gray-400'
                        }`}
                        style={{ left: `${barPct(miPrecioNum, minLocal, maxLocal)}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-0.5">
                    <span>{fmtCurrency(resultado.precios.minimo, selectedRate, currency)}</span>
                    <span className="text-blue-600 font-semibold">
                      Prom. {fmtCurrency(resultado.precios.promedio, selectedRate, currency)}
                    </span>
                    <span>{fmtCurrency(resultado.precios.maximo, selectedRate, currency)}</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 4 tarjetas de posicionamiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {posCards.map(c => (
              <div key={c.key}
                className={`rounded-2xl border-2 p-4 transition-all ${
                  posPreview === c.tipo
                    ? `${POS_COLOR[c.tipo].split(' ')[0]} ring-2 ${POS_COLOR[c.tipo].split(' ')[2]}`
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg" aria-hidden="true">{POS_ICON[c.tipo]}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${POS_COLOR[c.tipo]}`}>
                    {POS_LABEL[c.tipo]}
                  </span>
                </div>
                <p className="text-xl font-black text-gray-900 mb-1">
                  {fmtCurrency(c.data.precioRef, selectedRate, currency)}
                </p>
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  {rangoLabel(c.data.rangoMin, c.data.rangoMax, selectedRate, currency)}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">{c.data.descripcion}</p>
              </div>
            ))}
          </div>

          {/* Notas de mercado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">🏙️</span>
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-0.5">Contexto de mercado</p>
                <p className="text-xs text-amber-700 leading-relaxed">{resultado.notaMercado}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">💡</span>
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-0.5">Sobre este tratamiento</p>
                <p className="text-xs text-blue-700 leading-relaxed">{resultado.notaTratamiento}</p>
              </div>
            </div>
          </div>

          {/* Tu precio final */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Registrar tu precio final</h3>
            <p className="text-xs text-gray-400 mb-4">
              Tú tienes la última palabra. Guarda el precio que vas a cobrar para llevar tu historial comparativo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Mi precio ({resultado.unidad} · {currency}) *
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      value={miPrecio}
                      onChange={e => setMiPrecio(e.target.value)}
                      className="pl-7 pr-4 py-2.5 rounded-lg border-2 border-blue-300 text-base
                                 font-bold text-gray-900 focus:outline-none focus:ring-2
                                 focus:ring-blue-500 w-44"
                    />
                  </div>
                  {posPreview && (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${POS_COLOR[posPreview]}`}>
                      {POS_ICON[posPreview]} {POS_LABEL[posPreview]}
                    </span>
                  )}
                </div>
                {/* Referencia USD cuando la moneda no es USD */}
                {currency !== 'USD' && miPrecioNum > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ≈ ${Math.round(miPrecioNum / CURRENCY_RATES[currency]).toLocaleString('en-US')} USD equiv.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: paciente premium, seguro, etc."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {miPrecioNum > 0 && avgLocal > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <span>vs promedio de mercado ({currency}):</span>
                <span className={`font-bold ${
                  miPrecioNum > avgLocal ? 'text-green-600' : 'text-red-500'
                }`}>
                  {miPrecioNum > avgLocal ? '+' : ''}
                  {fmtCurrency(Math.abs(miPrecioNum - avgLocal) / selectedRate, selectedRate, currency)}
                  {' '}({((miPrecioNum / avgLocal - 1) * 100).toFixed(0)}%)
                </span>
              </div>
            )}

            <Button
              onClick={handleGuardar}
              loading={guardando}
              disabled={!miPrecioNum || miPrecioNum <= 0}
              className="mt-4"
            >
              💾 Guardar en historial
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Scripts de Venta Educativos
// ─────────────────────────────────────────────────────────────────────────────

function TabScripts() {
  const [scripts,  setScripts]  = useState<ScriptVenta[]>([]);
  const [cat,      setCat]      = useState<CategoriaScript | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [copiado,  setCopiado]  = useState<string | null>(null);

  useEffect(() => {
    getScripts().then(setScripts).finally(() => setLoading(false));
  }, []);

  const filtrados = scripts.filter(s => {
    const matchCat = cat === 'todos' || s.categoria === cat;
    const q = busqueda.toLowerCase();
    const matchQ = !q || s.condicion.toLowerCase().includes(q) || s.titulo.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  function copiarScript(s: ScriptVenta) {
    const texto = [
      `=== ${s.titulo} (${s.condicion}) ===\n`,
      s.intro,
      '\nPuntos de valor:',
      ...s.puntosValor.map(p => `• ${p}`),
      `\nCierre:\n${s.cierre}`,
    ].join('\n');
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(s.id);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por condición…"
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
        {(['todos', 'educacion', 'seguimiento', 'prevencion', 'estetico'] as const).map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              cat === c
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {c === 'todos' ? '📋 Todos' : CAT_LABEL[c as CategoriaScript]}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        {filtrados.length} script{filtrados.length !== 1 ? 's' : ''} — enfocados en educación y valor clínico, no en precio.
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtrados.map(s => (
          <div key={s.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm
                       hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${CAT_COLOR[s.categoria]}`}>
                    {CAT_LABEL[s.categoria]}
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm">{s.titulo}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{s.condicion}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{s.intro}</p>
            </div>

            <div className="border-t border-gray-100">
              <button
                onClick={() => setExpanded(prev => prev === s.id ? null : s.id)}
                className="w-full flex items-center justify-between px-5 py-3
                           text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <span>{expanded === s.id ? '▲ Ocultar script' : '▼ Ver script completo'}</span>
                <span className="text-gray-400 font-normal">{s.puntosValor.length} puntos de valor</span>
              </button>

              {expanded === s.id && (
                <div className="px-5 pb-5 space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Introducción</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{s.intro}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Puntos de valor clínico
                    </p>
                    <ul className="space-y-2">
                      {s.puntosValor.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                      Cierre / Perspectiva de valor
                    </p>
                    <p className="text-sm text-blue-900 italic leading-relaxed">
                      &ldquo;{s.cierre}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={() => copiarScript(s)}
                    className="w-full text-xs font-semibold text-gray-600 hover:text-gray-900
                               border border-gray-200 hover:border-gray-300 rounded-lg py-2
                               transition-colors flex items-center justify-center gap-2"
                  >
                    {copiado === s.id ? '✅ ¡Copiado!' : '📋 Copiar script al portapapeles'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-500 text-sm">Sin scripts para esa búsqueda</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: Mis Paquetes
// ─────────────────────────────────────────────────────────────────────────────

const PAQUETE_VACIO: CrearPaqueteInput = {
  nombre: '', tipo: 'basico', tratamiento: '', sesiones: 1,
  duracionMinutos: 30, periodicidad: '', precioFinal: 0, descripcion: '',
};

function ModalPaquete({
  inicial,
  onGuardar,
  onCerrar,
  loading,
}: {
  inicial:   CrearPaqueteInput & { id?: string };
  onGuardar: (data: CrearPaqueteInput) => void;
  onCerrar:  () => void;
  loading:   boolean;
}) {
  const [form, setForm] = useState<CrearPaqueteInput>(inicial);
  const [sugs, setSugs] = useState<SugerenciaPaquete[]>([]);
  const [loadingSugs, setLoadingSugs] = useState(false);

  function f<K extends keyof CrearPaqueteInput>(k: K, v: CrearPaqueteInput[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function cargarSugerencias() {
    if (!form.tratamiento.trim()) return;
    setLoadingSugs(true);
    try {
      const s = await getSugerencias(form.tratamiento);
      setSugs(s);
    } finally {
      setLoadingSugs(false);
    }
  }

  function aplicarSugerencia(s: SugerenciaPaquete) {
    setForm(prev => ({
      ...prev,
      tipo:            s.tipo,
      nombre:          s.nombre,
      sesiones:        s.sesiones,
      duracionMinutos: s.duracionMinutos,
      periodicidad:    s.periodicidad,
      descripcion:     s.descripcion,
    }));
    setSugs([]);
  }

  const valido = form.nombre.trim() && form.tratamiento.trim()
    && form.sesiones > 0 && form.duracionMinutos > 0
    && form.periodicidad.trim() && form.precioFinal > 0;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50
                    flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            {inicial.id ? 'Editar paquete' : 'Crear paquete'}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Tipo de paquete
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['basico', 'estandar', 'premium'] as EstructuraPaquete[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => f('tipo', t)}
                  className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.tipo === t
                      ? `${TIPO_COLOR[t]} ring-2 ${TIPO_RING[t]}`
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Tratamiento *
            </label>
            <div className="flex gap-2">
              <input
                value={form.tratamiento}
                onChange={e => f('tratamiento', e.target.value)}
                placeholder="Ej: Láser facial, Acné…"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={cargarSugerencias}
                disabled={!form.tratamiento.trim() || loadingSugs}
                className="px-3 py-2 rounded-lg border border-blue-200 text-xs font-semibold
                           text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors shrink-0"
              >
                {loadingSugs ? '⏳' : '✨ Sugerir'}
              </button>
            </div>
          </div>

          {sugs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700">
                Sugerencias de estructura — tú decides el precio:
              </p>
              {sugs.map(s => (
                <button
                  key={s.tipo}
                  type="button"
                  onClick={() => aplicarSugerencia(s)}
                  className="w-full text-left bg-white border border-blue-200 rounded-lg
                             px-3 py-2 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-blue-800">{s.nombre}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${TIPO_COLOR[s.tipo]}`}>
                      {TIPO_LABEL[s.tipo]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {s.sesiones} sesiones · {s.duracionMinutos} min · {s.periodicidad}
                    {s.incluyeEvaluacion ? ' · Incluye evaluación' : ''}
                  </p>
                </button>
              ))}
              <button onClick={() => setSugs([])} className="text-xs text-blue-400 hover:text-blue-600">
                Cerrar sugerencias ✕
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Nombre del paquete *
            </label>
            <input
              value={form.nombre}
              onChange={e => f('nombre', e.target.value)}
              placeholder="Ej: Protocolo Láser Completo"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Nº de sesiones *
              </label>
              <input
                type="number" min="1"
                value={form.sesiones}
                onChange={e => f('sesiones', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Duración (min) *
              </label>
              <input
                type="number" min="5"
                value={form.duracionMinutos}
                onChange={e => f('duracionMinutos', parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Periodicidad *
            </label>
            <input
              value={form.periodicidad}
              onChange={e => f('periodicidad', e.target.value)}
              placeholder="Ej: Cada 4 semanas, Semanal, Mensual…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Precio final del paquete *
              <span className="ml-1 text-gray-300 normal-case font-normal">(tú lo decides)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number" min="0"
                value={form.precioFinal || ''}
                onChange={e => f('precioFinal', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg border-2 border-green-300 text-sm
                           font-semibold focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={e => f('descripcion', e.target.value)}
              placeholder="Qué incluye, para quién es ideal…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => onGuardar(form)}
            loading={loading}
            disabled={!valido}
            className="flex-1"
          >
            {inicial.id ? '💾 Guardar cambios' : '✅ Crear paquete'}
          </Button>
          <Button variant="ghost" onClick={onCerrar} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalAceptacion({
  paquete,
  onRegistrar,
  onCerrar,
  loading,
}: {
  paquete:     PaquetePersonalizado;
  onRegistrar: (aceptado: boolean, pacienteRef: string) => void;
  onCerrar:    () => void;
  loading:     boolean;
}) {
  const [aceptado,    setAceptado]    = useState<boolean | null>(null);
  const [pacienteRef, setPacienteRef] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Registrar resultado</h2>
        <p className="text-sm text-gray-400 mb-5">
          Paquete: <strong>{paquete.nombre}</strong>
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setAceptado(true)}
            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
              aceptado === true
                ? 'bg-green-50 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
            }`}
          >
            ✅ Aceptó
          </button>
          <button
            type="button"
            onClick={() => setAceptado(false)}
            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
              aceptado === false
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'
            }`}
          >
            ❌ No aceptó
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Referencia del paciente (opcional)
          </label>
          <input
            value={pacienteRef}
            onChange={e => setPacienteRef(e.target.value)}
            placeholder="Nombre o ID del paciente…"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 mt-5">
          <Button
            onClick={() => onRegistrar(aceptado!, pacienteRef)}
            loading={loading}
            disabled={aceptado === null}
            className="flex-1"
          >
            Registrar
          </Button>
          <Button variant="ghost" onClick={onCerrar} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabPaquetes({ onToast }: { onToast: (msg: string) => void }) {
  const [paquetes,   setPaquetes]  = useState<PaquetePersonalizado[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [modal,      setModal]     = useState<(CrearPaqueteInput & { id?: string }) | null>(null);
  const [saving,     setSaving]    = useState(false);
  const [modalAcep,  setModalAcep] = useState<PaquetePersonalizado | null>(null);
  const [savingAcep, setSavingAcep]= useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    listarPaquetes().then(setPaquetes).finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleGuardar(data: CrearPaqueteInput) {
    setSaving(true);
    try {
      if (modal?.id) {
        const updated = await actualizarPaquete(modal.id, data);
        setPaquetes(prev => prev.map(p => p.id === updated.id ? updated : p));
        onToast('✅ Paquete actualizado.');
      } else {
        const nuevo = await crearPaquete(data);
        setPaquetes(prev => [...prev, nuevo]);
        onToast('✅ Paquete creado correctamente.');
      }
      setModal(null);
    } catch (e) {
      onToast('⚠️ ' + (e instanceof ApiError ? e.message : 'Error al guardar.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRegistrarAceptacion(aceptado: boolean, pacienteRef: string) {
    if (!modalAcep) return;
    setSavingAcep(true);
    try {
      await registrarAceptacion(modalAcep.id, aceptado, pacienteRef);
      setModalAcep(null);
      onToast(aceptado ? '✅ Aceptación registrada.' : '📝 Rechazo registrado.');
    } catch (e) {
      onToast('⚠️ ' + (e instanceof ApiError ? e.message : 'Error al registrar.'));
    } finally {
      setSavingAcep(false);
    }
  }

  const tipos: EstructuraPaquete[] = ['basico', 'estandar', 'premium'];

  return (
    <>
      {modal && (
        <ModalPaquete
          inicial={modal}
          onGuardar={handleGuardar}
          onCerrar={() => setModal(null)}
          loading={saving}
        />
      )}
      {modalAcep && (
        <ModalAceptacion
          paquete={modalAcep}
          onRegistrar={handleRegistrarAceptacion}
          onCerrar={() => setModalAcep(null)}
          loading={savingAcep}
        />
      )}

      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          Define hasta 3 paquetes personalizados (Básico, Estándar, Premium). Los precios siempre los decides tú.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tipos.map(tipo => {
              const p = paquetes.find(pk => pk.tipo === tipo);
              return p ? (
                <div key={tipo}
                  className={`bg-white rounded-2xl border-2 shadow-sm p-5 flex flex-col gap-3 ${TIPO_RING[tipo]} ring-1`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${TIPO_COLOR[tipo]}`}>
                      {TIPO_LABEL[tipo]}
                    </span>
                    <button
                      onClick={() => setModal({ ...p })}
                      className="text-xs text-gray-400 hover:text-blue-600 font-medium"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{p.nombre}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{p.tratamiento}</p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>🗓️ {p.sesiones} sesiones · {p.duracionMinutos} min c/u</p>
                    <p>🔁 {p.periodicidad}</p>
                    {p.descripcion && <p className="text-gray-400 italic line-clamp-2">{p.descripcion}</p>}
                  </div>
                  <div className="mt-auto">
                    <p className="text-2xl font-black text-gray-900">$ {fmt(p.precioFinal)}</p>
                    <p className="text-xs text-gray-400">precio del paquete</p>
                  </div>
                  <button
                    onClick={() => setModalAcep(p)}
                    className="w-full text-xs font-semibold py-2 rounded-xl
                               bg-gray-50 hover:bg-blue-50 border border-gray-200
                               hover:border-blue-300 text-gray-600 hover:text-blue-700
                               transition-colors"
                  >
                    📊 Registrar resultado
                  </button>
                </div>
              ) : (
                <button
                  key={tipo}
                  onClick={() => setModal({ ...PAQUETE_VACIO, tipo })}
                  className={`rounded-2xl border-2 border-dashed p-5 flex flex-col
                              items-center justify-center gap-3 min-h-[180px]
                              hover:bg-gray-50 transition-colors text-center
                              ${tipo === 'estandar'
                                ? 'border-blue-200 bg-blue-50/30'
                                : tipo === 'premium'
                                ? 'border-purple-200 bg-purple-50/30'
                                : 'border-gray-200 bg-gray-50/50'}`}
                >
                  <span className="text-3xl opacity-30">
                    {tipo === 'basico' ? '📦' : tipo === 'estandar' ? '⭐' : '💎'}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${
                      tipo === 'estandar' ? 'text-blue-500' :
                      tipo === 'premium'  ? 'text-purple-500' : 'text-gray-400'
                    }`}>
                      Paquete {TIPO_LABEL[tipo]}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Sin configurar</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-white
                                   border border-gray-200 px-3 py-1 rounded-full">
                    + Crear
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: Analytics — Benchmarking + Paquetes
// ─────────────────────────────────────────────────────────────────────────────

function TabAnalytics() {
  const [paquetes,           setPaquetes]           = useState<AnalyticsPaquete[]>([]);
  const [resumenPaquetes,    setResumenPaquetes]    = useState<ResumenAnalytics | null>(null);
  const [precios,            setPrecios]            = useState<PrecioRegistrado[]>([]);
  const [resumenBenchmarking,setResumenBenchmarking]= useState<ResumenBenchmarking | null>(null);
  const [loading,            setLoading]            = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(d => {
        setPaquetes(d.paquetes);
        setResumenPaquetes(d.resumenPaquetes);
        setPrecios(d.precios);
        setResumenBenchmarking(d.resumenBenchmarking);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const sinDatos = !resumenPaquetes && !resumenBenchmarking;
  const sinPrecios = precios.length === 0;
  const sinPaquetes = paquetes.length === 0;

  if (sinDatos) return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">📊</p>
      <p className="text-gray-600 font-medium">Sin datos de analytics todavía</p>
      <p className="text-sm text-gray-400 mt-1">
        Consulta el benchmarking, guarda precios y registra resultados de paquetes para ver estadísticas aquí.
      </p>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ─── Sección Benchmarking ─── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <span>🗺️</span> Historial de precios — Benchmarking
        </h2>

        {sinPrecios ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
            <p className="text-3xl mb-3">🗺️</p>
            <p className="text-gray-500 text-sm">Aún no has guardado precios.</p>
            <p className="text-xs text-gray-400 mt-1">
              → Tab <strong>Benchmarking</strong> → Consultar mercado → Guardar en historial
            </p>
          </div>
        ) : (
          <>
            {/* Stats de benchmarking */}
            {resumenBenchmarking && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Precios registrados', value: String(resumenBenchmarking.totalRegistros),                        icon: '📋', color: 'bg-blue-50  text-blue-600'   },
                  { label: 'Promedio (USD eq.)',   value: `$ ${fmt(resumenBenchmarking.precioPromedio)}`,                   icon: '⚖️', color: 'bg-gray-50  text-gray-600'  },
                  { label: 'Más rentable',         value: resumenBenchmarking.tratamientoMasRentable ?? '—',           icon: '💰', color: 'bg-green-50 text-green-600'  },
                  { label: 'Más premium',          value: resumenBenchmarking.tratamientoMasPremium  ?? '—',           icon: '👑', color: 'bg-amber-50  text-amber-600' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-4 ${s.color.split(' ')[0]} border border-current/10`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl" aria-hidden="true">{s.icon}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${s.color.split(' ')[1]}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabla de precios */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Mis precios vs mercado ({precios.length} registro{precios.length !== 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-gray-400">Precios en moneda local por zona</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Tratamiento', 'Zona', 'Mi precio', 'Bench. prom.', 'Diferencial', 'Posicionamiento', 'Fecha'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                                               text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {precios.map(p => {
                      // Mostrar en la moneda nativa de la zona
                      const zm   = ZONA_MONEDA[p.zona] ?? { code: 'USD', rate: 1 };
                      const code = zm.code;
                      const rate = zm.rate;
                      return (
                        <tr key={p.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{p.tratamientoLabel}</p>
                            <p className="text-xs text-gray-400">{p.unidad}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p className="text-gray-600">{p.zonaLabel}</p>
                            <p className="text-gray-400">{code}</p>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {fmtCurrency(p.precioFinal, rate, code)}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {fmtCurrency(p.benchmarkProm, rate, code)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold ${
                              p.diferencial > 0 ? 'text-green-600' :
                              p.diferencial < 0 ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              {p.diferencial > 0 ? '+' : ''}
                              {fmtCurrency(Math.abs(p.diferencial), rate, code)}
                              {p.diferencial < 0 ? ' ↓' : p.diferencial > 0 ? ' ↑' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${POS_COLOR[p.posicionamiento]}`}>
                              {POS_ICON[p.posicionamiento]} {POS_LABEL[p.posicionamiento]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {fmtDate(p.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ─── Sección Paquetes ─── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <span>📦</span> Analytics — Mis Paquetes
        </h2>

        {sinPaquetes ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
            <p className="text-3xl mb-3">📦</p>
            <p className="text-gray-500 text-sm">Aún no tienes paquetes configurados.</p>
            <p className="text-xs text-gray-400 mt-1">
              → Tab <strong>Mis Paquetes</strong> → Crear paquete → Registrar resultado
            </p>
          </div>
        ) : (
          <>
            {/* Stats de paquetes */}
            {resumenPaquetes && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total ofertas',      value: String(resumenPaquetes.totalOfertas),                       icon: '📋', color: 'bg-blue-50  text-blue-600'   },
                  { label: 'Aceptaron',          value: String(resumenPaquetes.totalAceptados),                     icon: '✅', color: 'bg-green-50 text-green-600'  },
                  { label: 'Tasa conversión',    value: `${resumenPaquetes.tasaConversionGlobal}%`,                  icon: '📈', color: 'bg-purple-50 text-purple-600'},
                  { label: 'Ingreso estimado',   value: `$ ${fmt(resumenPaquetes.ingresoTotalEstimado)}`,            icon: '💰', color: 'bg-amber-50  text-amber-600' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-4 ${s.color.split(' ')[0]} border border-current/10`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl" aria-hidden="true">{s.icon}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${s.color.split(' ')[1]}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {resumenPaquetes?.mejorPaquete && resumenPaquetes.totalOfertas > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200
                              rounded-xl px-5 py-4">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Mejor paquete por conversión</p>
                  <p className="text-sm text-amber-700 mt-0.5">{resumenPaquetes.mejorPaquete}</p>
                </div>
              </div>
            )}

            {/* Tabla de paquetes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Detalle por paquete</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Paquete', 'Tratamiento', 'Precio', 'Ofertas', 'Aceptados', 'Conversión', 'Ingreso'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                                               text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paquetes.map(p => (
                      <tr key={p.paqueteId}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{p.nombre}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${TIPO_COLOR[p.tipo]}`}>
                              {TIPO_LABEL[p.tipo]}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.tratamiento}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">$ {fmt(p.precioFinal)}</td>
                        <td className="px-4 py-3 text-gray-600">{p.totalOfertas}</td>
                        <td className="px-4 py-3 text-gray-600">{p.totalAceptados}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2 shrink-0">
                              <div
                                className={`h-2 rounded-full ${
                                  p.tasaConversion >= 60 ? 'bg-green-500' :
                                  p.tasaConversion >= 30 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${Math.min(p.tasaConversion, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 shrink-0">
                              {p.tasaConversion}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-700">
                          $ {fmt(p.ingresoTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paquetes.every(p => p.totalOfertas === 0) && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  Aún no hay registros de resultados. Usa &quot;Registrar resultado&quot; en tus paquetes.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'benchmarking' | 'scripts' | 'paquetes' | 'analytics';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'benchmarking', label: 'Benchmarking', icon: '🗺️' },
  { id: 'scripts',      label: 'Scripts',      icon: '📝' },
  { id: 'paquetes',     label: 'Mis Paquetes', icon: '📦' },
  { id: 'analytics',   label: 'Analytics',    icon: '📈' },
];

export default function NegocioPage() {
  const [tab,   setTab]   = useState<Tab>('benchmarking');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {toast && <Toast msg={toast} />}

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span aria-hidden="true">💼</span> Asesor Comercial
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Decisiones informadas basadas en el mercado real, no en fórmulas.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm
                            font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
                  tab === t.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido del tab */}
          {tab === 'benchmarking' && <TabBenchmarking onToast={showToast} />}
          {tab === 'scripts'      && <TabScripts />}
          {tab === 'paquetes'     && <TabPaquetes onToast={showToast} />}
          {tab === 'analytics'    && <TabAnalytics />}

        </main>
      </div>
    </ProtectedRoute>
  );
}
