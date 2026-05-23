// ─────────────────────────────────────────────────────────────────────────────
// src/services/negocioService.ts — Derma Copilot
//
// Lógica de negocio del módulo Asesor Comercial:
//   · getTratamientos / getZonas  — catálogos para dropdowns
//   · getBenchmarking             — rango de mercado por tratamiento + zona
//   · detectarPosicionamiento     — clasifica precio vs mercado
//   · getSugerenciasPaquetes      — estructuras sugeridas de paquetes
//   · getScripts                  — biblioteca de scripts educativos
//   · getAnalytics                — analytics paquetes + benchmarking
// ─────────────────────────────────────────────────────────────────────────────

import { NegocioModel } from '../models/Negocio';
import type {
  ItemCatalogo,
  ResultadoBenchmarking,
  TipoPosicionamiento,
  SugerenciaPaquete,
  ScriptVenta,
  AnalyticsPaquete,
  ResumenAnalytics,
  ResumenBenchmarking,
  CategoriaScript,
} from '../types/negocio';

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE BENCHMARKING
// Precios en USD equivalente (referencia orientativa LATAM)
// ─────────────────────────────────────────────────────────────────────────────

interface BaseTratamiento {
  label:           string;
  unidad:          string;
  notaTratamiento: string;
  baseMin:         number;
  baseAvg:         number;
  baseMax:         number;
}

// Precios base en USD equivalente (referencia mercado internacional / LATAM premium).
// Cada zona aplica su factor y luego el frontend multiplica por tasaCambio para
// mostrar en moneda local (COP, MXN, etc.).
const TRATAMIENTOS_BASE: Record<string, BaseTratamiento> = {
  'acne': {
    label:           'Acné (consulta + tratamiento)',
    unidad:          'por sesión',
    notaTratamiento: 'Consulta y tratamiento activo de acné. El precio varía según severidad (comedones vs acné nódulo-quístico) y si se combina con procedimientos (láser, extracción, ALA-PDT).',
    baseMin: 55, baseAvg: 145, baseMax: 340,
  },
  'cicatrices': {
    label:           'Cicatrices (acné / post-quirúrgicas)',
    unidad:          'por sesión',
    notaTratamiento: 'Cicatrices tratadas con láser fraccionado, dermapen, CROSS o combinación. Alta variabilidad según profundidad, área y tecnología usada.',
    baseMin: 140, baseAvg: 360, baseMax: 820,
  },
  'manchas': {
    label:           'Manchas / Melasma',
    unidad:          'por sesión',
    notaTratamiento: 'Melasma, manchas solares e hiperpigmentación. El precio sube cuando se combina láser Q-switched con peeling o despigmentantes tópicos prescritos.',
    baseMin: 75, baseAvg: 175, baseMax: 400,
  },
  'botox': {
    label:           'Botox / Toxina Botulínica (por zona)',
    unidad:          'por zona',
    notaTratamiento: 'Toxina botulínica por zona anatómica (frente, entrecejo, patas de gallo). El precio depende de la marca (Botox®, Dysport®, Xeomin®) y unidades aplicadas.',
    baseMin: 190, baseAvg: 430, baseMax: 980,
  },
  'rellenos': {
    label:           'Rellenos Faciales (por ml)',
    unidad:          'por ml',
    notaTratamiento: 'Ácido hialurónico para labios, pómulos, surcos, etc. Alta variabilidad por marca de producto (Juvederm®, Restylane®, Radiesse®), zona y volumen.',
    baseMin: 330, baseAvg: 680, baseMax: 1550,
  },
  'laser-depilacion': {
    label:           'Láser Depilación (por área)',
    unidad:          'por área',
    notaTratamiento: 'Precio por área anatómica/sesión. Tecnologías como diodo o Alexandrita tienen precios mayores. Las zonas grandes (piernas, espalda) pueden cotizarse como paquete.',
    baseMin: 95, baseAvg: 240, baseMax: 560,
  },
  'laser-rejuvenecimiento': {
    label:           'Fotorejuvenecimiento Láser',
    unidad:          'por sesión',
    notaTratamiento: 'Fotorejuvenecimiento con IPL, Nd:YAG, CO₂ fraccionado o radiofrecuencia. La tecnología utilizada y el área tratada (cara completa vs zonas) determinan el precio.',
    baseMin: 150, baseAvg: 360, baseMax: 860,
  },
  'peeling': {
    label:           'Peeling Químico',
    unidad:          'por sesión',
    notaTratamiento: 'Desde peeling superficial (AHA/BHA, glicólico, mandélico) hasta medio (TCA). El peeling profundo (fenol) puede superar ampliamente el rango máximo.',
    baseMin: 55, baseAvg: 140, baseMax: 320,
  },
  'dermapen': {
    label:           'Dermapen / Microneedling',
    unidad:          'por sesión',
    notaTratamiento: 'Microneedling facial. El precio puede subir si incluye PRP (plasma rico en plaquetas), sueros vitamínicos o factores de crecimiento aplicados durante el procedimiento.',
    baseMin: 95, baseAvg: 210, baseMax: 480,
  },
  'mesoterapia': {
    label:           'Mesoterapia Facial / Capilar',
    unidad:          'por sesión',
    notaTratamiento: 'Mesoterapia con cocktail de vitaminas, ácido hialurónico o activos para alopecia. El precio incluye los activos inyectados y varía según el protocolo.',
    baseMin: 75, baseAvg: 175, baseMax: 400,
  },
  'psoriasis': {
    label:           'Psoriasis (consulta + plan)',
    unidad:          'por consulta',
    notaTratamiento: 'Consulta de seguimiento y manejo de psoriasis en placas o gutata. Precio por consulta individual dentro de un plan de manejo crónico.',
    baseMin: 85, baseAvg: 165, baseMax: 370,
  },
  'dermatitis': {
    label:           'Dermatitis Atópica',
    unidad:          'por consulta',
    notaTratamiento: 'Consulta y tratamiento de dermatitis atópica o de contacto. Incluye evaluación clínica, diagnóstico diferencial y prescripción de plan terapéutico.',
    baseMin: 65, baseAvg: 135, baseMax: 295,
  },
  'limpieza-facial': {
    label:           'Limpieza Facial Profunda',
    unidad:          'por sesión',
    notaTratamiento: 'Limpieza con o sin extracción de comedones. Gran variabilidad precio/calidad: desde spas hasta clínicas dermatológicas con ultrasonido/alta frecuencia.',
    baseMin: 38, baseAvg: 90, baseMax: 210,
  },
  'hidratacion': {
    label:           'Hidratación / Barrera Cutánea',
    unidad:          'por sesión',
    notaTratamiento: 'Tratamiento de hidratación profunda con productos médicos. Puede incluir máscara de hidrogel, niacinamida, ceramidas o inyectables de biorevitalización.',
    baseMin: 48, baseAvg: 115, baseMax: 250,
  },
};

interface ZonaConfig {
  label:        string;
  factor:       number;
  codigoMoneda: string;   // 'COP', 'MXN', 'USD', 'ARS', 'CLP', 'PEN'
  tasaCambio:   number;   // unidades de moneda local por 1 USD
  nota:         string;
}

const ZONAS_CONFIG: Record<string, ZonaConfig> = {
  'bogota': {
    label:        'Bogotá, Colombia',
    factor:       0.90,
    codigoMoneda: 'COP',
    tasaCambio:   4200,
    nota:   'Capital colombiana con alta concentración de especialistas. Mercado fragmentado entre clínicas premium (Zona Rosa, Usaquén) y consultorios de barrio. La competencia es elevada y los pacientes comparan precios activamente.',
  },
  'medellin': {
    label:        'Medellín, Colombia',
    factor:       0.82,
    codigoMoneda: 'COP',
    tasaCambio:   4200,
    nota:   'Fuerte cultura de bienestar y estética. Precios 10-15% por debajo de Bogotá. Ciudad con alta demanda en procedimientos estéticos no invasivos y creciente turismo médico.',
  },
  'cali': {
    label:        'Cali, Colombia',
    factor:       0.72,
    codigoMoneda: 'COP',
    tasaCambio:   4200,
    nota:   'Tercer mercado dermatológico en Colombia. Precios más accesibles que las otras capitales. Alta demanda en tratamientos de manchas, cicatrices y procedimientos estéticos.',
  },
  'cdmx': {
    label:        'Ciudad de México',
    factor:       1.30,
    codigoMoneda: 'MXN',
    tasaCambio:   17.5,
    nota:   'Mercado más grande de LATAM. Alta variabilidad interna: Polanco/Lomas cobra hasta 2× más que la periferia. Gran concentración de especialistas con alto volumen de pacientes.',
  },
  'monterrey': {
    label:        'Monterrey, México',
    factor:       1.20,
    codigoMoneda: 'MXN',
    tasaCambio:   17.5,
    nota:   'Mercado de alto poder adquisitivo. Profesionistas y ejecutivos que valoran la calidad. Menor competencia que CDMX pero precios similares en zonas premium (San Pedro, Valle).',
  },
  'buenos-aires': {
    label:        'Buenos Aires, Argentina',
    factor:       0.88,
    codigoMoneda: 'ARS',
    tasaCambio:   1050,
    nota:   'Mercado maduro con amplia oferta de especialistas. Precios comprimidos por contexto económico. Alta demanda en procedimientos estéticos. Importante flujo de turismo médico desde provincias.',
  },
  'santiago': {
    label:        'Santiago, Chile',
    factor:       1.10,
    codigoMoneda: 'CLP',
    tasaCambio:   960,
    nota:   'Mercado estable y de los más maduros de LATAM. Precios consistentes en clínicas privadas. Pacientes con alto nivel de información y expectativas claras. Concentración en Providencia, Las Condes, Vitacura.',
  },
  'lima': {
    label:        'Lima, Perú',
    factor:       0.78,
    codigoMoneda: 'PEN',
    tasaCambio:   3.8,
    nota:   'Mercado en crecimiento acelerado. Precios más accesibles pero con tendencia alcista. Alta demanda en tratamientos de manchas e hiperpigmentación por el fototipo predominante.',
  },
  'latam': {
    label:        'LATAM (referencia regional)',
    factor:       1.00,
    codigoMoneda: 'USD',
    tasaCambio:   1,
    nota:   'Promedio estimado para América Latina. Útil como contexto regional. Los precios reales variarán de forma significativa según ciudad, tipo de clínica y segmento de pacientes.',
  },
};

// ── Catálogos ─────────────────────────────────────────────────────────────────

export function getTratamientos(): ItemCatalogo[] {
  return Object.entries(TRATAMIENTOS_BASE).map(([id, v]) => ({ id, label: v.label }));
}

export function getZonas(): ItemCatalogo[] {
  return Object.entries(ZONAS_CONFIG).map(([id, v]) => ({ id, label: v.label }));
}

// ── Benchmarking ──────────────────────────────────────────────────────────────

export function getBenchmarking(
  tratamiento: string,
  zona:        string,
): ResultadoBenchmarking | null {
  const base = TRATAMIENTOS_BASE[tratamiento];
  const zone = ZONAS_CONFIG[zona];
  if (!base || !zone) return null;

  const min  = Math.round(base.baseMin * zone.factor);
  const avg  = Math.round(base.baseAvg * zone.factor);
  const max  = Math.round(base.baseMax * zone.factor);

  const econMax  = Math.round(avg * 0.80);
  const promMin  = Math.round(avg * 0.80);
  const promMax  = Math.round(avg * 1.20);
  const premMin  = Math.round(avg * 1.20);
  const ultraMin = Math.round(max * 1.05);

  const pos: ResultadoBenchmarking['posicionamientos'] = {
    economico: {
      rangoMin:    0,
      rangoMax:    econMax,
      descripcion: 'Estrategia de volumen. Atrae pacientes por precio, requiere mayor número de consultas para igual rentabilidad. Riesgo de percepción de calidad baja.',
      precioRef:   Math.round((min + avg) / 2 * 0.85),
    },
    promedio: {
      rangoMin:    promMin,
      rangoMax:    promMax,
      descripcion: 'Posición segura y competitiva. La mayoría de especialistas en esta zona cobra en este rango. Buena relación calidad-precio percibida.',
      precioRef:   avg,
    },
    premium: {
      rangoMin:    premMin,
      rangoMax:    max,
      descripcion: 'Para especialistas con diferenciador claro: ubicación premium, tecnología de punta, alta subespecialización o reputación establecida.',
      precioRef:   Math.round((premMin + max) / 2),
    },
    ultraPremium: {
      rangoMin:    ultraMin,
      rangoMax:    null,
      descripcion: 'Clínicas de lujo, figuras de referencia o tecnologías exclusivas. Requiere posicionamiento de marca muy consolidado y experiencia de paciente diferencial.',
      precioRef:   Math.round(max * 1.3),
    },
  };

  return {
    tratamiento,
    tratamientoLabel: base.label,
    zona,
    zonaLabel:        zone.label,
    precios:          { minimo: min, promedio: avg, maximo: max },
    unidad:           base.unidad,
    codigoMoneda:     zone.codigoMoneda,
    tasaCambio:       zone.tasaCambio,
    posicionamientos: pos,
    notaMercado:      zone.nota,
    notaTratamiento:  base.notaTratamiento,
  };
}

// ── Detección de posicionamiento ──────────────────────────────────────────────

export function detectarPosicionamiento(
  precio:       number,
  benchmarkProm: number,
): TipoPosicionamiento {
  const ratio = precio / benchmarkProm;
  if (ratio < 0.80) return 'economico';
  if (ratio < 1.20) return 'promedio';
  if (ratio < 1.80) return 'premium';
  return 'ultra-premium';
}

// ── Sugerencias de paquetes ───────────────────────────────────────────────────

export function getSugerenciasPaquetes(tratamiento: string): SugerenciaPaquete[] {
  const t = tratamiento.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const isLaser    = ['laser', 'depilac'].some(k => t.includes(k));
  const isCronico  = ['psoriasis', 'dermatitis', 'acne', 'eczema'].some(k => t.includes(k));
  const isEstetico = ['botox', 'relleno', 'rejuvenec', 'hialuronico'].some(k => t.includes(k));

  if (isLaser) return [
    { tipo: 'basico',   nombre: 'Inicio de Protocolo', sesiones: 3,  duracionMinutos: 30, periodicidad: 'Cada 4 semanas', incluyeEvaluacion: false, descripcion: 'Primeras sesiones para evaluar respuesta del tejido.' },
    { tipo: 'estandar', nombre: 'Protocolo Completo',  sesiones: 6,  duracionMinutos: 30, periodicidad: 'Cada 4 semanas', incluyeEvaluacion: true,  descripcion: 'Protocolo estándar recomendado con seguimiento.' },
    { tipo: 'premium',  nombre: 'Protocolo Intensivo', sesiones: 10, duracionMinutos: 45, periodicidad: 'Cada 3 semanas', incluyeEvaluacion: true,  descripcion: 'Máximo resultado. Mayor frecuencia y duración.' },
  ];
  if (isCronico) return [
    { tipo: 'basico',   nombre: 'Control Básico',  sesiones: 2, duracionMinutos: 30, periodicidad: 'Mensual',        incluyeEvaluacion: true,  descripcion: 'Consultas de control y ajuste terapéutico.' },
    { tipo: 'estandar', nombre: 'Manejo Activo',   sesiones: 4, duracionMinutos: 30, periodicidad: 'Cada 3 semanas', incluyeEvaluacion: true,  descripcion: 'Seguimiento cercano para estabilizar la condición.' },
    { tipo: 'premium',  nombre: 'Plan Integral',   sesiones: 6, duracionMinutos: 45, periodicidad: 'Quincenal',      incluyeEvaluacion: true,  descripcion: 'Manejo intensivo con ajustes, educación y monitoreo.' },
  ];
  if (isEstetico) return [
    { tipo: 'basico',   nombre: 'Sesión Única',  sesiones: 1, duracionMinutos: 45, periodicidad: 'Según necesidad', incluyeEvaluacion: true,  descripcion: 'Sesión individual con evaluación previa.' },
    { tipo: 'estandar', nombre: 'Mantenimiento', sesiones: 3, duracionMinutos: 45, periodicidad: 'Cada 4 meses',   incluyeEvaluacion: false, descripcion: 'Plan de mantenimiento anual (3 sesiones de retoque).' },
    { tipo: 'premium',  nombre: 'Plan Anual',    sesiones: 4, duracionMinutos: 60, periodicidad: 'Cada 3 meses',   incluyeEvaluacion: true,  descripcion: 'Plan anual con evaluación, 4 sesiones y seguimiento fotográfico.' },
  ];
  return [
    { tipo: 'basico',   nombre: 'Paquete Básico',    sesiones: 2, duracionMinutos: 30, periodicidad: 'Quincenal',    incluyeEvaluacion: false, descripcion: 'Protocolo inicial de evaluación y primeras sesiones.' },
    { tipo: 'estandar', nombre: 'Paquete Estándar',  sesiones: 4, duracionMinutos: 30, periodicidad: 'Semanal',      incluyeEvaluacion: true,  descripcion: 'Protocolo completo con seguimiento incluido.' },
    { tipo: 'premium',  nombre: 'Paquete Premium',   sesiones: 6, duracionMinutos: 45, periodicidad: 'Cada 10 días', incluyeEvaluacion: true,  descripcion: 'Protocolo intensivo con máxima frecuencia y duración.' },
  ];
}

// ── Scripts de venta educativos ───────────────────────────────────────────────

const SCRIPTS: ScriptVenta[] = [
  {
    id: 'psoriasis-educacion', condicion: 'Psoriasis', titulo: 'Manejo Integral de la Psoriasis', categoria: 'educacion',
    intro: 'La psoriasis es una enfermedad inflamatoria crónica que afecta la calidad de vida. Un plan estructurado permite controlar brotes y mantener períodos de remisión prolongados.',
    puntosValor: [
      'El tratamiento continuo puede reducir la frecuencia de brotes hasta en un 70%.',
      'La adherencia previene complicaciones graves como artritis psoriásica.',
      'El seguimiento regular permite ajustar la terapia antes de que el brote escale.',
      'Pacientes bajo tratamiento reportan mejora significativa en autoestima y vida social.',
      'Un control temprano reduce costos totales de atención a largo plazo.',
    ],
    cierre: 'El plan propuesto no es un gasto: es la diferencia entre un brote manejado ambulatoriamente y una hospitalización. Invertir en control continuo es siempre más eficiente.',
  },
  {
    id: 'acne-educacion', condicion: 'Acné moderado-severo', titulo: 'Tratamiento Completo del Acné', categoria: 'educacion',
    intro: 'El acné moderado a severo requiere un enfoque terapéutico estructurado para prevenir cicatrices y el impacto emocional a largo plazo.',
    puntosValor: [
      'El tratamiento temprano y consistente previene cicatrices permanentes difíciles de corregir.',
      'Un protocolo completo reduce el tiempo total de tratamiento y el número de recaídas.',
      'La supervisión médica garantiza el uso correcto y evita efectos adversos por automedicación.',
      'Mejora notable en autopercepción del paciente a partir de la 6ª semana de adherencia.',
      'Tratar cicatrices de acné posteriores cuesta entre 5 y 10 veces más que prevenir su formación.',
    ],
    cierre: 'Iniciar el plan ahora es la decisión más costo-efectiva. Las cicatrices de acné son permanentes; los brotes activos, tratables con el protocolo correcto.',
  },
  {
    id: 'melanoma-prevencion', condicion: 'Revisión preventiva / Melanoma', titulo: 'Valor Clínico de la Detección Temprana', categoria: 'prevencion',
    intro: 'La detección temprana del melanoma incrementa la tasa de supervivencia del 20% al 98%. Una revisión dermatoscópica anual es la herramienta más eficiente de prevención oncológica en piel.',
    puntosValor: [
      'Melanoma en etapa I: supervivencia a 5 años del 98%. En etapa IV: del 20%.',
      'La dermatoscopía identifica lesiones sospechosas antes de ser visibles al ojo clínico.',
      'Un mapa de lunares permite comparar cambios evolutivos año con año.',
      'Costo del tratamiento quirúrgico temprano vs. quimioterapia: hasta 50 veces menor.',
      'Historial familiar de melanoma → mayor riesgo; el seguimiento anual es la mejor inversión preventiva.',
    ],
    cierre: 'La revisión no es un lujo, es la diferencia entre un procedimiento ambulatorio y un tratamiento oncológico.',
  },
  {
    id: 'dermatitis-seguimiento', condicion: 'Dermatitis Atópica', titulo: 'Control de la Dermatitis Atópica', categoria: 'seguimiento',
    intro: 'La dermatitis atópica es crónica y mejora significativamente con un plan de manejo personalizado. La irregularidad en el tratamiento es la causa principal de recaídas.',
    puntosValor: [
      'El 60% de los pacientes con DA logra mejoría sostenida con tratamiento continuo.',
      'El manejo adecuado interrumpe el "ciclo prurito-rascado" que agrava la barrera cutánea.',
      'Un plan de cuidado reduce las visitas de urgencia por brotes en un 40-50%.',
      'En niños, el control adecuado reduce la incidencia futura de asma y rinitis alérgica.',
      'El seguimiento permite ajustar según temporada y factores desencadenantes específicos.',
    ],
    cierre: 'El plan está diseñado para que el paciente llegue a controlar su condición, no solo aliviar síntomas momentáneos.',
  },
  {
    id: 'laser-educacion', condicion: 'Tratamiento Láser', titulo: 'Resultados Clínicos del Tratamiento Láser', categoria: 'educacion',
    intro: 'El láser es uno de los procedimientos con mayor evidencia científica en dermatología. Los resultados son acumulativos: cada sesión prepara el tejido para la siguiente.',
    puntosValor: [
      'Los resultados del láser son progresivos: el protocolo completo garantiza el resultado duradero.',
      'El abandono a mitad del tratamiento puede generar resultados parciales o irregulares.',
      'La técnica especializada minimiza el riesgo de hiperpigmentación post-tratamiento.',
      'Evidencia clínica respalda eficacia en más del 85% de los pacientes con adherencia completa.',
      'El intervalo entre sesiones no es arbitrario: permite la regeneración tisular óptima.',
    ],
    cierre: 'La inversión en el protocolo completo es más eficiente que pagar sesiones sueltas sin obtener el resultado esperado.',
  },
  {
    id: 'melasma-seguimiento', condicion: 'Melasma / Manchas', titulo: 'Manejo del Melasma a Largo Plazo', categoria: 'seguimiento',
    intro: 'El melasma es una condición crónica recidivante. El objetivo no es solo "aclarar"; es establecer un protocolo de mantenimiento que prevenga la recurrencia.',
    puntosValor: [
      'El melasma sin mantenimiento recidiva en el 90% de los casos al primer año.',
      'Un plan de mantenimiento reduce la recurrencia a menos del 30%.',
      'La fotoprotección es parte del tratamiento médico, no una recomendación opcional.',
      'La dermoscopía de control permite ajustar sin sobre-tratar ni infratratar.',
      'La combinación tópico + procedimientos es el estándar de mayor evidencia.',
    ],
    cierre: 'El mantenimiento no es gasto adicional: es la garantía de que los resultados conseguidos sean duraderos.',
  },
  {
    id: 'rejuvenec-estetico', condicion: 'Botox / Rejuvenecimiento', titulo: 'Valor Clínico del Rejuvenecimiento Facial', categoria: 'estetico',
    intro: 'Los tratamientos de rejuvenecimiento con toxina botulínica y rellenos son procedimientos médicos que requieren evaluación, planificación y seguimiento especializado.',
    puntosValor: [
      'La evaluación previa diseña un resultado natural y acorde al caso individual.',
      'Los resultados de un especialista vs. un aplicador no calificado son cualitativamente distintos.',
      'Un plan estratégico reduce el volumen total de producto necesario a lo largo del tiempo.',
      'La documentación fotográfica permite al paciente ver el progreso objetivo del tratamiento.',
      'El enfoque médico prioriza salud de los tejidos, no solo el resultado estético inmediato.',
    ],
    cierre: 'Un tratamiento planificado por un especialista es una inversión en bienestar y salud, no solo en apariencia.',
  },
  {
    id: 'prevencion-cuidado', condicion: 'Cuidado preventivo / Hidratación', titulo: 'Piel Sana como Base de Cualquier Tratamiento', categoria: 'prevencion',
    intro: 'La barrera cutánea íntegra es el fundamento de cualquier tratamiento dermatológico efectivo. Invertir en hidratación y cuidado preventivo reduce la necesidad de intervenciones más costosas.',
    puntosValor: [
      'Una barrera sana mejora la respuesta a cualquier tratamiento activo (láser, peeling, etc.).',
      'Pacientes con rutina establecida requieren menos sesiones de tratamiento correctivo.',
      'La hidratación médica difiere cualitativamente de los cosméticos sin evidencia clínica.',
      'El cuidado preventivo puede retrasar el envejecimiento cutáneo visible 10-15 años.',
      'Es la base que potencia los resultados de cualquier procedimiento estético o médico.',
    ],
    cierre: 'Cuidar la piel hoy es la inversión más eficiente para minimizar intervenciones más costosas en el futuro.',
  },
];

export function getScripts(categoria?: CategoriaScript): ScriptVenta[] {
  if (!categoria) return SCRIPTS;
  return SCRIPTS.filter(s => s.categoria === categoria);
}

// ── Analytics combinados ──────────────────────────────────────────────────────

export async function getAnalytics(userId: string): Promise<{
  paquetes:           AnalyticsPaquete[];
  resumenPaquetes:    ResumenAnalytics;
  precios:            import('../types/negocio').PrecioRegistrado[];
  resumenBenchmarking: ResumenBenchmarking;
}> {
  const paquetes     = await NegocioModel.findPaquetesByUser(userId);
  const aceptaciones = await NegocioModel.findAceptacionesByUser(userId);
  const precios      = await NegocioModel.findPreciosByUser(userId);

  // ── Analytics paquetes ──────────────────────────────────────────────────
  const analyticsPaquetes: AnalyticsPaquete[] = paquetes.map(p => {
    const rel    = aceptaciones.filter(a => a.paqueteId === p.id);
    const acepta = rel.filter(a => a.aceptado).length;
    const total  = rel.length;
    return {
      paqueteId:      p.id,
      nombre:         p.nombre,
      tipo:           p.tipo,
      tratamiento:    p.tratamiento,
      precioFinal:    p.precioFinal,
      totalOfertas:   total,
      totalAceptados: acepta,
      tasaConversion: total > 0 ? Math.round((acepta / total) * 100) : 0,
      ingresoTotal:   acepta * p.precioFinal,
    };
  });

  const totalOfertas   = analyticsPaquetes.reduce((s, a) => s + a.totalOfertas,   0);
  const totalAceptados = analyticsPaquetes.reduce((s, a) => s + a.totalAceptados, 0);
  const ingresoTotal   = analyticsPaquetes.reduce((s, a) => s + a.ingresoTotal,   0);
  const mejorPaquete   = analyticsPaquetes.length > 0
    ? [...analyticsPaquetes].sort((a, b) => b.tasaConversion - a.tasaConversion)[0]?.nombre ?? null
    : null;

  // ── Analytics benchmarking ──────────────────────────────────────────────
  const totalRegistros = precios.length;
  const precioPromedio = totalRegistros > 0
    ? Math.round(precios.reduce((s, p) => s + p.precioFinal, 0) / totalRegistros)
    : 0;

  const masRentable = totalRegistros > 0
    ? [...precios].sort((a, b) => b.precioFinal - a.precioFinal)[0]?.tratamientoLabel ?? null
    : null;

  const masPremium = totalRegistros > 0
    ? [...precios]
        .filter(p => p.benchmarkProm > 0)
        .sort((a, b) => (b.precioFinal / b.benchmarkProm) - (a.precioFinal / a.benchmarkProm))[0]
        ?.tratamientoLabel ?? null
    : null;

  return {
    paquetes:         analyticsPaquetes,
    resumenPaquetes:  {
      totalOfertas,
      totalAceptados,
      tasaConversionGlobal:  totalOfertas > 0 ? Math.round((totalAceptados / totalOfertas) * 100) : 0,
      ingresoTotalEstimado:  ingresoTotal,
      mejorPaquete,
    },
    precios,
    resumenBenchmarking: {
      totalRegistros,
      tratamientoMasRentable: masRentable,
      tratamientoMasPremium:  masPremium,
      precioPromedio,
    },
  };
}
