'use client';
// app/dashboard/automatizaciones/page.tsx — Derma Copilot Frontend
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams }       from 'next/navigation';
import { Navbar }                from '../../../components/Navbar';
import { ProtectedRoute }        from '../../../components/ProtectedRoute';
import { Card }                  from '../../../components/ui/Card';
import { Button }                from '../../../components/ui/Button';
import {
  getEstado,
  updateConfig,
  getLogs,
  conectarGoogle,
  desconectarGoogle,
  conectarWhatsApp,
  desconectarWhatsApp,
  conectarSMS,
  desconectarSMS,
}                                from '../../../lib/automatizaciones';
import type {
  EstadoAutomatizaciones,
  ConfigAutomatizaciones,
  LogAutomatizacion,
  ConfigInput,
  EstadoConexion,
}                                from '../../../types/automatizaciones';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SERVICIO_LABEL: Record<string, string> = {
  google_calendar: '📅 Google Calendar',
  whatsapp:        '💬 WhatsApp',
  sms:             '📱 SMS',
};

const TIPO_LABEL: Record<string, string> = {
  conexion:       'Conexión',
  crear_evento:   'Crear evento',
  propuesta:      'Propuesta de venta',
  recordatorio:   'Recordatorio',
  reporte:        'Reporte médico',
  confirmacion:   'Confirmación',
};

const ESTADO_BADGE: Record<LogAutomatizacion['estado'], string> = {
  enviado:  'bg-green-100 text-green-700',
  error:    'bg-red-100 text-red-700',
  simulado: 'bg-yellow-100 text-yellow-700',
};

// ── Toggle switch ─────────────────────────────────────────────────────────────

interface ToggleProps {
  label:    string;
  sublabel?: string;
  checked:  boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, sublabel, checked, disabled = false, onChange }: ToggleProps) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => !disabled && onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={[
            'w-10 h-6 rounded-full transition-colors',
            checked && !disabled ? 'bg-blue-600' : 'bg-gray-200',
          ].join(' ')}
        />
        <div
          className={[
            'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1',
          ].join(' ')}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 leading-tight">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );
}

// ── Badge de conexión ─────────────────────────────────────────────────────────

function ConexionBadge({ estado, modoDemo }: { estado: EstadoConexion; modoDemo: boolean }) {
  const isConnected = estado === 'conectado';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
      isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      {isConnected ? 'CONECTADO' : 'Desconectado'}
      {isConnected && modoDemo && (
        <span className="ml-1 text-yellow-600 font-semibold">(demo)</span>
      )}
    </span>
  );
}

// ── Modal para ingresar número ────────────────────────────────────────────────

interface PhoneModalProps {
  title:      string;
  sublabel:   string;
  onConnect:  (phone: string) => Promise<void>;
  onClose:    () => void;
  loading:    boolean;
}

function PhoneModal({ title, sublabel, onConnect, onClose, loading }: PhoneModalProps) {
  const [phone, setPhone] = useState('');
  const [err,   setErr  ] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setErr('Formato inválido. Ejemplo: +573001234567');
      return;
    }
    setErr('');
    await onConnect(phone);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <Card className="w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-4">{sublabel}</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Número de teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+573001234567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>
          <p className="text-xs text-gray-400">
            Incluye el código de país. Ej: +57 para Colombia, +52 para México.
          </p>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={loading} className="flex-1">
              {loading ? 'Conectando…' : 'Conectar'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Secciones de automatizaciones
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  icon:      string;
  title:     string;
  desc:      string;
  estado:    EstadoConexion;
  modoDemo:  boolean;
  onConnect:    () => void;
  onDisconnect: () => void;
  connecting:   boolean;
  children:     React.ReactNode;
}

function AutoSection({ icon, title, desc, estado, modoDemo, onConnect, onDisconnect, connecting, children }: SectionProps) {
  const connected = estado === 'conectado';
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{icon}</span>
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ConexionBadge estado={estado} modoDemo={modoDemo} />
          {connected ? (
            <Button variant="ghost" size="sm" onClick={onDisconnect} disabled={connecting}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs">
              Desconectar
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onConnect} disabled={connecting}>
              {connecting ? 'Conectando…' : 'Conectar'}
            </Button>
          )}
        </div>
      </div>
      <div className={`px-6 py-5 space-y-4 ${!connected ? 'opacity-50 pointer-events-none' : ''}`}>
        {!connected && (
          <p className="text-xs text-gray-400 italic -mt-1 mb-2">
            Conecta el servicio para activar estas opciones.
          </p>
        )}
        {children}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal (inner — usa useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

function AutomatizacionesInner() {
  const searchParams = useSearchParams();

  const [estado,      setEstado    ] = useState<EstadoAutomatizaciones | null>(null);
  const [logs,        setLogs      ] = useState<LogAutomatizacion[]>([]);
  const [loading,     setLoading   ] = useState(true);
  const [saving,      setSaving    ] = useState(false);
  const [toast,       setToast     ] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Modales de número de teléfono
  const [waModal,     setWaModal   ] = useState(false);
  const [smsModal,    setSmsModal  ] = useState(false);
  const [connecting,  setConnecting] = useState<'google' | 'wa' | 'sms' | null>(null);

  // ── Cargar datos ────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    try {
      const [est, lg] = await Promise.all([getEstado(), getLogs()]);
      setEstado(est);
      setLogs(lg);
    } catch {
      showToast('Error al cargar automatizaciones', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  // Detectar redirect de Google OAuth
  useEffect(() => {
    if (searchParams.get('connected') === 'google') {
      showToast('✅ Google Calendar conectado correctamente', 'ok');
      void reload();
      // Limpiar query param sin recargar
      window.history.replaceState({}, '', '/dashboard/automatizaciones');
    }
  }, [searchParams, reload]);

  // ── Toast ───────────────────────────────────────────────────────────────────

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Toggles ─────────────────────────────────────────────────────────────────

  async function handleToggle(key: keyof ConfigInput, value: boolean) {
    if (!estado) return;
    setSaving(true);
    const prev = { ...estado.config };
    // Optimistic update
    setEstado(s => s ? { ...s, config: { ...s.config, [key]: value } } : s);
    try {
      await updateConfig({ [key]: value });
    } catch {
      // Revert on error
      setEstado(s => s ? { ...s, config: prev } : s);
      showToast('No se pudo guardar la configuración', 'err');
    } finally {
      setSaving(false);
    }
  }

  // ── Conectar Google ─────────────────────────────────────────────────────────

  async function handleConectarGoogle() {
    setConnecting('google');
    try {
      const res = await conectarGoogle();
      if (res.authUrl) {
        // Redirigir al flujo OAuth de Google
        window.location.href = res.authUrl;
      } else {
        // Modo demo: conectado directamente
        showToast(res.message ?? '✅ Google Calendar conectado (modo demo)', 'ok');
        await reload();
      }
    } catch (e) {
      showToast((e as Error).message, 'err');
    } finally {
      setConnecting(null);
    }
  }

  async function handleDesconectarGoogle() {
    setConnecting('google');
    try {
      await desconectarGoogle();
      showToast('Google Calendar desconectado.', 'ok');
      await reload();
    } catch (e) {
      showToast((e as Error).message, 'err');
    } finally {
      setConnecting(null);
    }
  }

  // ── Conectar WhatsApp ───────────────────────────────────────────────────────

  async function handleConectarWA(phone: string) {
    setConnecting('wa');
    try {
      const res = await conectarWhatsApp(phone);
      setWaModal(false);
      showToast(res.message ?? '✅ WhatsApp conectado', 'ok');
      await reload();
    } catch (e) {
      showToast((e as Error).message, 'err');
    } finally {
      setConnecting(null);
    }
  }

  async function handleDesconectarWA() {
    setConnecting('wa');
    try {
      await desconectarWhatsApp();
      showToast('WhatsApp desconectado.', 'ok');
      await reload();
    } catch (e) {
      showToast((e as Error).message, 'err');
    } finally {
      setConnecting(null);
    }
  }

  // ── Conectar SMS ────────────────────────────────────────────────────────────

  async function handleConectarSMS(phone: string) {
    setConnecting('sms');
    try {
      const res = await conectarSMS(phone);
      setSmsModal(false);
      showToast(res.message ?? '✅ SMS conectado', 'ok');
      await reload();
    } catch (e) {
      showToast((e as Error).message, 'err');
    } finally {
      setConnecting(null);
    }
  }

  async function handleDesconectarSMS() {
    setConnecting('sms');
    try {
      await desconectarSMS();
      showToast('SMS desconectado.', 'ok');
      await reload();
    } catch (e) {
      showToast((e as Error).message, 'err');
    } finally {
      setConnecting(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const cfg  = estado?.config;
  const conn = estado?.conexiones;

  return (
    <>
      {/* Toast global */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm transition-all ${
          toast.type === 'ok'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Modal WhatsApp */}
      {waModal && (
        <PhoneModal
          title="Conectar WhatsApp Business"
          sublabel="Ingresa el número de WhatsApp Business desde el que enviarás mensajes a tus pacientes."
          onConnect={handleConectarWA}
          onClose={() => setWaModal(false)}
          loading={connecting === 'wa'}
        />
      )}

      {/* Modal SMS */}
      {smsModal && (
        <PhoneModal
          title="Conectar SMS"
          sublabel="Ingresa el número de teléfono desde el que enviarás SMS a tus pacientes."
          onConnect={handleConectarSMS}
          onClose={() => setSmsModal(false)}
          loading={connecting === 'sms'}
        />
      )}

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">⚡ Automatizaciones</h1>
            <p className="text-gray-500 text-sm mt-1">
              Conecta tus herramientas y automatiza la comunicación con pacientes.
              {saving && <span className="ml-2 text-blue-500 text-xs">Guardando…</span>}
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Google Calendar ────────────────────────────────────────── */}
              <AutoSection
                icon="📅"
                title="Google Calendar"
                desc="Crea eventos automáticamente y envía recordatorios de citas."
                estado={conn?.google_calendar.estado ?? 'desconectado'}
                modoDemo={conn?.google_calendar.modoDemo ?? false}
                onConnect={handleConectarGoogle}
                onDisconnect={handleDesconectarGoogle}
                connecting={connecting === 'google'}
              >
                <Toggle
                  label="Crear evento automático al agendar cita"
                  sublabel="Agrega la cita a tu Google Calendar al confirmarla con un paciente."
                  checked={cfg?.gcalCrearEvento ?? false}
                  onChange={v => void handleToggle('gcalCrearEvento', v)}
                />
                <Toggle
                  label="Enviar recordatorio 24h antes"
                  sublabel="Google Calendar enviará un email de recordatorio al médico y al paciente."
                  checked={cfg?.gcalRecordatorio24h ?? false}
                  onChange={v => void handleToggle('gcalRecordatorio24h', v)}
                />
              </AutoSection>

              {/* ── WhatsApp Business ──────────────────────────────────────── */}
              <AutoSection
                icon="💬"
                title="WhatsApp Business"
                desc="Envía propuestas, recordatorios y reportes directamente al WhatsApp del paciente."
                estado={conn?.whatsapp.estado ?? 'desconectado'}
                modoDemo={conn?.whatsapp.modoDemo ?? false}
                onConnect={() => setWaModal(true)}
                onDisconnect={handleDesconectarWA}
                connecting={connecting === 'wa'}
              >
                {conn?.whatsapp.metadata.phoneNumber && (
                  <p className="text-xs text-gray-400 -mt-1">
                    Número: <span className="font-medium text-gray-600">{conn.whatsapp.metadata.phoneNumber}</span>
                  </p>
                )}
                <Toggle
                  label="Enviar propuesta de venta vía WhatsApp"
                  sublabel="Al crear un paquete personalizado, el paciente recibe la propuesta por WhatsApp."
                  checked={cfg?.waEnviarPropuesta ?? false}
                  onChange={v => void handleToggle('waEnviarPropuesta', v)}
                />
                <Toggle
                  label="Enviar recordatorio de cita 24h antes"
                  sublabel="El paciente recibe un mensaje de WhatsApp el día anterior a su cita."
                  checked={cfg?.waRecordatorio24h ?? false}
                  onChange={v => void handleToggle('waRecordatorio24h', v)}
                />
                <Toggle
                  label="Enviar reporte al paciente después de consulta"
                  sublabel="El resumen de la consulta se envía automáticamente al WhatsApp del paciente."
                  checked={cfg?.waReportePaciente ?? false}
                  onChange={v => void handleToggle('waReportePaciente', v)}
                />
              </AutoSection>

              {/* ── SMS ────────────────────────────────────────────────────── */}
              <AutoSection
                icon="📱"
                title="SMS"
                desc="Confirmaciones y recordatorios de cita por mensaje de texto."
                estado={conn?.sms.estado ?? 'desconectado'}
                modoDemo={conn?.sms.modoDemo ?? false}
                onConnect={() => setSmsModal(true)}
                onDisconnect={handleDesconectarSMS}
                connecting={connecting === 'sms'}
              >
                {conn?.sms.metadata.phoneNumber && (
                  <p className="text-xs text-gray-400 -mt-1">
                    Número: <span className="font-medium text-gray-600">{conn.sms.metadata.phoneNumber}</span>
                  </p>
                )}
                <Toggle
                  label="Enviar confirmación de cita por SMS"
                  sublabel="El paciente recibe un SMS cuando se confirma su cita."
                  checked={cfg?.smsConfirmacion ?? false}
                  onChange={v => void handleToggle('smsConfirmacion', v)}
                />
                <Toggle
                  label="Enviar recordatorio 48h antes"
                  sublabel="SMS de recordatorio dos días antes de la cita programada."
                  checked={cfg?.smsRecordatorio48h ?? false}
                  onChange={v => void handleToggle('smsRecordatorio48h', v)}
                />
              </AutoSection>

              {/* ── Banner modo demo ────────────────────────────────────────── */}
              {(conn?.google_calendar.modoDemo || conn?.whatsapp.modoDemo) && (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">⚙️</span>
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Modo demo activo</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Los mensajes y eventos se simulan (no se envían realmente).
                        Para activar las integraciones reales agrega las variables de entorno en el backend:
                      </p>
                      <ul className="text-xs text-yellow-700 mt-2 space-y-0.5 font-mono">
                        {conn.google_calendar.modoDemo && (
                          <>
                            <li>• GOOGLE_CLIENT_ID</li>
                            <li>• GOOGLE_CLIENT_SECRET</li>
                          </>
                        )}
                        {conn.whatsapp.modoDemo && (
                          <>
                            <li>• TWILIO_ACCOUNT_SID</li>
                            <li>• TWILIO_AUTH_TOKEN</li>
                            <li>• TWILIO_PHONE_NUMBER</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Historial de automatizaciones ───────────────────────────── */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Historial de ejecuciones
                </h2>

                {logs.length === 0 ? (
                  <Card className="p-10 text-center">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm text-gray-500">
                      Aún no hay automatizaciones ejecutadas.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Conecta un servicio y activa los toggles para comenzar.
                    </p>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-left">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicio</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                {fmtDate(log.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                                {SERVICIO_LABEL[log.servicio] ?? log.servicio}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {TIPO_LABEL[log.tipo] ?? log.tipo}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-700">
                                {log.pacienteNombre}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[log.estado]}`}>
                                  {log.estado === 'enviado'  ? '✓ Enviado'  :
                                   log.estado === 'simulado' ? '⚡ Demo'    :
                                   '✗ Error'}
                                </span>
                                {log.detalle && (
                                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]" title={log.detalle}>
                                    {log.detalle}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export con Suspense (requerido por useSearchParams en Next.js App Router)
// ─────────────────────────────────────────────────────────────────────────────

export default function AutomatizacionesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Cargando automatizaciones…</p>
        </div>
      }>
        <AutomatizacionesInner />
      </Suspense>
    </ProtectedRoute>
  );
}
