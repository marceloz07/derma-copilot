// ─────────────────────────────────────────────────────────────────────────────
// src/services/casosService.ts — Derma Copilot
//
// Orquesta el análisis dermatológico:
//   1. Valida la imagen
//   2. Llama a Claude Vision API con prompt dermatológico
//   3. Parsea el JSON estructurado de respuesta
//   4. Persiste el caso en la BD (o memoria)
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { CasoModel } from '../models/Caso';
import type {
  AnalisisDermatologico,
  AnalizarCasoInput,
  Caso,
} from '../types/casos';

// ── Cliente Anthropic (singleton) ────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY no está configurada en el entorno.');
    }
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ── Prompt dermatológico profesional ─────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un asistente de diagnóstico dermatológico de alta precisión especializado en el apoyo a dermatólogos.
Analizas imágenes clínicas y síntomas para generar diagnósticos diferenciales estructurados.

Reglas:
- Responde ÚNICAMENTE con JSON válido, sin texto antes ni después
- Usa terminología médica precisa en español
- Lista 2-4 diagnósticos diferenciales ordenados de mayor a menor probabilidad
- El presupuesto considera el mercado latinoamericano en USD
- La urgencia refleja la necesidad de atención médica inmediata
- Siempre incluye el disclaimer de que es herramienta de apoyo, no diagnóstico definitivo`;

function buildUserPrompt(sintomas: string): string {
  return `Analiza la imagen dermatológica y los siguientes síntomas del paciente:

SÍNTOMAS REPORTADOS:
${sintomas || 'No se especificaron síntomas adicionales.'}

Proporciona el análisis en el siguiente formato JSON exacto:
{
  "diagnosticoDiferencial": [
    {
      "condicion": "nombre de la condición",
      "probabilidad": "Alta|Media|Baja",
      "descripcion": "descripción clínica breve y precisa",
      "codigoCIE": "código CIE-10 (ej: L20.9)"
    }
  ],
  "recomendaciones": [
    "recomendación clínica 1",
    "recomendación clínica 2"
  ],
  "presupuestoEstimado": {
    "min": 0,
    "max": 0,
    "moneda": "USD",
    "descripcion": "descripción del tratamiento estimado"
  },
  "sesionesNecesarias": {
    "cantidad": 0,
    "frecuencia": "frecuencia recomendada",
    "descripcion": "descripción del plan de seguimiento"
  },
  "urgencia": "Baja|Media|Alta|Urgente",
  "notasAdicionales": "observaciones clínicas importantes y disclaimer"
}

Criterios de urgencia:
- Urgente: posible melanoma, celulitis severa, reacción alérgica grave
- Alta: lesión sospechosa, infección activa
- Media: condición crónica no controlada
- Baja: condición benigna estable`;
}

// ── Análisis con imagen ───────────────────────────────────────────────────────

async function analizarConClaude(
  input: AnalizarCasoInput,
): Promise<AnalisisDermatologico> {
  const client = getClient();

  const userContent: Anthropic.MessageParam['content'] = [];

  // Añadir imagen si está presente
  if (input.imagenBase64 && input.mimeType) {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
    type ValidMime = (typeof validMimeTypes)[number];

    if (!validMimeTypes.includes(input.mimeType as ValidMime)) {
      throw new Error('Tipo de imagen no soportado. Use JPEG, PNG, WebP o GIF.');
    }

    userContent.push({
      type:   'image',
      source: {
        type:       'base64',
        media_type: input.mimeType as ValidMime,
        data:       input.imagenBase64,
      },
    });
  }

  userContent.push({
    type: 'text',
    text: buildUserPrompt(input.sintomas),
  });

  const response = await client.messages.create({
    model:      'claude-opus-4-7',   // Modelo más capaz para visión médica
    max_tokens: 2048,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userContent }],
  });

  // Extraer texto de la respuesta
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude no devolvió una respuesta de texto.');
  }

  // Parsear JSON — Claude puede añadir ```json ... ``` a veces
  const raw = textBlock.text.trim();
  const jsonStr = raw.startsWith('```')
    ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : raw;

  let analisis: AnalisisDermatologico;
  try {
    analisis = JSON.parse(jsonStr) as AnalisisDermatologico;
  } catch {
    throw new Error('La respuesta de Claude no tiene formato JSON válido.');
  }

  return analisis;
}

// ── Mock para desarrollo (sin API key) ───────────────────────────────────────

function mockAnalisis(): AnalisisDermatologico {
  return {
    diagnosticoDiferencial: [
      {
        condicion:    'Dermatitis atópica',
        probabilidad: 'Alta',
        descripcion:  'Inflamación crónica de la piel caracterizada por prurito intenso, eritema y xerosis. Frecuente en zonas de flexión.',
        codigoCIE:    'L20.9',
      },
      {
        condicion:    'Psoriasis en placas',
        probabilidad: 'Media',
        descripcion:  'Enfermedad inflamatoria crónica con placas eritematoescamosas bien delimitadas, de evolución crónica y recurrente.',
        codigoCIE:    'L40.0',
      },
      {
        condicion:    'Dermatitis de contacto',
        probabilidad: 'Baja',
        descripcion:  'Reacción inflamatoria cutánea por exposición a agente externo irritante o alérgeno. Distribución topográfica orientativa.',
        codigoCIE:    'L25.9',
      },
    ],
    recomendaciones: [
      'Aplicar emoliente hidratante 2 veces al día en piel limpia y húmeda.',
      'Evitar jabones con fragancia y productos irritantes.',
      'Corticosteroide tópico de potencia media (ej: betametasona 0.05%) por 7-14 días en zonas afectadas.',
      'Antihistamínico oral nocturno para control del prurito.',
      'Biopsia si las lesiones no responden al tratamiento en 4 semanas.',
    ],
    presupuestoEstimado: {
      min:         80,
      max:         250,
      moneda:      'USD',
      descripcion: 'Incluye consultas de seguimiento (2-3), emolientes y corticosteroide tópico. Costos variables según región y cobertura de seguro.',
    },
    sesionesNecesarias: {
      cantidad:    3,
      frecuencia:  'Cada 2-4 semanas',
      descripcion: 'Control inicial a las 2 semanas para evaluar respuesta al tratamiento. Seguimiento mensual durante 2 meses. Posible derivación a alergólogo si no hay mejoría.',
    },
    urgencia:         'Media',
    notasAdicionales: '⚠️ MODO DEMO — Este análisis es generado sin IA real. Configure ANTHROPIC_API_KEY para activar el análisis clínico real con Claude Vision. Este resultado es únicamente una herramienta de apoyo y no reemplaza el criterio clínico del profesional médico.',
  };
}

// ── Función principal pública ─────────────────────────────────────────────────

export async function analizarCaso(
  input: AnalizarCasoInput,
  userId: string,
): Promise<Caso> {
  let analisis: AnalisisDermatologico;

  if (!env.ANTHROPIC_API_KEY) {
    // Modo demo: respuesta simulada cuando no hay API key configurada
    console.warn('[casosService] ANTHROPIC_API_KEY no configurada — usando mock de análisis.');
    await new Promise(r => setTimeout(r, 1500));  // simula latencia de red
    analisis = mockAnalisis();
  } else {
    analisis = await analizarConClaude(input);
  }

  // Persistir el caso (sin la imagen en el stored object para ahorrar memoria)
  const caso = await CasoModel.create({
    userId,
    sintomas:     input.sintomas,
    analisis,
    imagenBase64: input.imagenBase64,
    mimeType:     input.mimeType,
  });

  return caso;
}

export async function getCasosByUser(userId: string): Promise<Omit<Caso, 'imagenBase64'>[]> {
  const casos = await CasoModel.findByUserId(userId);
  return casos.map(CasoModel.sanitize);
}
