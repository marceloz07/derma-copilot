// ─────────────────────────────────────────────────────────────────────────────
// src/services/consultasService.ts — Derma Copilot
//
// Lógica de negocio del módulo de chat clínico:
//   · procesarMensajeStream  — respuesta SSE en tiempo real
//   · obtenerSugerencias     — 3 autocompletados rápidos mientras escribe
//   · generarReporte         — reporte clínico estructurado
// ─────────────────────────────────────────────────────────────────────────────

import type { Response } from 'express';
import Anthropic         from '@anthropic-ai/sdk';
import { env }           from '../config/env';
import { ChatSessionModel } from '../models/ChatSession';
import type { ContextoCaso, EnviarMensajeInput, SugerenciasInput } from '../types/consultas';

// ── Cliente singleton ─────────────────────────────────────────────────────────

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

// ── System prompt dermatológico ────────────────────────────────────────────────

function buildSystemPrompt(contexto?: ContextoCaso): string {
  const ctx = contexto
    ? `
CONTEXTO DEL CASO ACTUAL:
• Síntomas: ${contexto.sintomas}
${contexto.diagnosticos?.length ? `• Diagnósticos previos: ${contexto.diagnosticos.join(', ')}` : ''}
${contexto.urgencia             ? `• Urgencia: ${contexto.urgencia}` : ''}
${contexto.tratamientoActual    ? `• Tratamiento actual: ${contexto.tratamientoActual}` : ''}
${contexto.notasAdicionales     ? `• Notas: ${contexto.notasAdicionales}` : ''}
`
    : '';

  return `Eres un asistente clínico especializado en dermatología, diseñado para apoyar al dermatólogo durante la consulta médica en tiempo real.

TU ROL:
- Analizar síntomas y hallazgos dermatológicos descritos por el médico
- Proporcionar diagnósticos diferenciales con justificación clínica basada en evidencia
- Sugerir preguntas dirigidas para refinar el diagnóstico
- Recomendar estudios complementarios (dermatoscopía, biopsia, cultivos, KOH, etc.)
- Proponer opciones terapéuticas actualizadas según guías clínicas
- Alertar sobre signos de alarma (criterios ABCDE, signos de infección severa, reacciones sistémicas)
${ctx}
FORMATO DE RESPUESTA (siempre en este orden):
1. **Análisis** — 1-2 frases resumiendo el cuadro clínico
2. **Diagnósticos diferenciales** — lista ordenada por probabilidad
3. **Plan sugerido** — estudios + tratamiento

Al final de CADA respuesta incluir exactamente:

---SUGERENCIAS_CLINICAS---
• [Pregunta o acción clínica 1]
• [Pregunta o acción clínica 2]
• [Pregunta o acción clínica 3]
---FIN_SUGERENCIAS---

REGLAS:
- Responde en español con terminología médica precisa
- Máximo 350 palabras por respuesta principal
- Sé directo y accionable: el médico está en consulta
- Este es apoyo clínico, no diagnóstico definitivo`;
}

// ── Parser de sugerencias ──────────────────────────────────────────────────────

function parsearSugerencias(contenido: string): { texto: string; sugerencias: string[] } {
  const re = /---SUGERENCIAS_CLINICAS---\n([\s\S]*?)---FIN_SUGERENCIAS---/;
  const match = contenido.match(re);

  if (!match) return { texto: contenido.trim(), sugerencias: [] };

  const sugerencias = match[1]
    .split('\n')
    .map(s => s.replace(/^[•\-\*\d.]\s*/, '').trim())
    .filter(s => s.length > 5);

  const texto = contenido.replace(re, '').trim();
  return { texto, sugerencias };
}

// ── Mocks para desarrollo sin API key ─────────────────────────────────────────

const MOCK_DELAY_MS = 40;  // simula latencia de token streaming

const MOCK_RESPONSE = `**Análisis:** El cuadro describe una dermatosis inflamatoria crónica con componente pruriginoso, consistente con una de las condiciones más frecuentes en dermatología.

**Diagnósticos diferenciales:**
1. **Dermatitis atópica** *(Alta probabilidad)* — prurito crónico, posible distribución en flexuras, historia atópica asociada (rinitis, asma)
2. **Psoriasis en placas** *(Media)* — si presenta escamas plateadas bien delimitadas, afectación codos/rodillas
3. **Dermatitis de contacto** *(Media)* — valorar exposición a irritantes o alérgenos por distribución topográfica
4. **Liquen simple crónico** *(Baja)* — si hay liquenificación por rascado crónico

**Plan sugerido:**
- Dermatoscopía: evaluar patrón vascular y escamas
- Test epicutáneo si se sospecha alérgeno de contacto
- Terapia inicial: emoliente intensivo + corticosteroide tópico potencia media 14 días
- Control en 3-4 semanas para valorar respuesta`;

const MOCK_SUGERENCIAS = [
  '¿Hay antecedentes familiares de atopia (asma, rinitis, eccema)?',
  'Realizar dermoscopía para evaluar patrón vascular y pigmentario',
  '¿El paciente ha utilizado corticosteroides tópicos previamente?',
];

// ── procesarMensajeStream — SSE streaming ────────────────────────────────────

/**
 * Procesa el mensaje del médico y envía la respuesta como SSE stream.
 *
 * Eventos emitidos:
 *   data: { type: 'delta',  text: '...' }           — fragmento de texto
 *   data: { type: 'done',   sugerencias, tokensUsados, totalTokensSesion, mensajeId }
 *   data: { type: 'error',  error: '...' }           — en caso de fallo
 */
export async function procesarMensajeStream(
  input:  EnviarMensajeInput,
  userId: string,
  res:    Response,
): Promise<void> {
  // Guardar mensaje del usuario en historial
  await ChatSessionModel.addMessage(input.casoId, userId, {
    role:     'user',
    contenido: input.mensaje,
  });

  // Historial de mensajes para contexto conversacional (últimos 20)
  const sesion = await ChatSessionModel.findByCasoId(input.casoId)
               ?? await ChatSessionModel.getOrCreate(input.casoId, userId);
  const historial = ChatSessionModel.toAnthropicMessages(sesion, 20);

  let contenidoCompleto = '';
  let tokensUsados      = 0;

  // ── MODO MOCK ──────────────────────────────────────────────────────────────
  if (!env.ANTHROPIC_API_KEY) {
    // Simular streaming carácter a carácter
    for (const char of MOCK_RESPONSE) {
      contenidoCompleto += char;
      res.write(`data: ${JSON.stringify({ type: 'delta', text: char })}\n\n`);
      await new Promise(r => setTimeout(r, MOCK_DELAY_MS));
    }
    tokensUsados = 220;

    parsearSugerencias(contenidoCompleto);   // descartamos el parsing mock

    const sesionFinal = await ChatSessionModel.addMessage(input.casoId, userId, {
      role:         'assistant',
      contenido:    contenidoCompleto,
      sugerencias:  MOCK_SUGERENCIAS,
      tokensUsados,
    });

    const mensajeId = sesionFinal.mensajes[sesionFinal.mensajes.length - 1]?.id ?? '';

    res.write(`data: ${JSON.stringify({
      type:              'done',
      sugerencias:       MOCK_SUGERENCIAS,
      tokensUsados,
      totalTokensSesion: sesionFinal.totalTokens,
      mensajeId,
    })}\n\n`);
    res.end();
    return;
  }

  // ── MODO REAL — Anthropic streaming ───────────────────────────────────────
  const client = getClient();

  const stream = client.messages.stream({
    model:     'claude-haiku-4-5-20251001',   // Más rápido para chat en tiempo real
    max_tokens: 1024,
    system:    buildSystemPrompt(input.contextoCaso),
    messages:  historial,
  });

  stream.on('text', (text: string) => {
    contenidoCompleto += text;
    res.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
  });

  stream.on('finalMessage', async (finalMsg: Anthropic.Message) => {
    tokensUsados = finalMsg.usage.input_tokens + finalMsg.usage.output_tokens;

    const { texto, sugerencias } = parsearSugerencias(contenidoCompleto);

    const sesionFinal = await ChatSessionModel.addMessage(input.casoId, userId, {
      role:         'assistant',
      contenido:    texto,
      sugerencias,
      tokensUsados,
    });

    const mensajeId = sesionFinal.mensajes[sesionFinal.mensajes.length - 1]?.id ?? '';

    res.write(`data: ${JSON.stringify({
      type:              'done',
      sugerencias,
      tokensUsados,
      totalTokensSesion: sesionFinal.totalTokens,
      mensajeId,
    })}\n\n`);
    res.end();
  });

  stream.on('error', (err: Error) => {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  });
}

// ── obtenerSugerencias — respuesta rápida sin streaming ───────────────────────

export async function obtenerSugerencias(input: SugerenciasInput): Promise<string[]> {
  if (!input.texto || input.texto.trim().length < 5) return [];

  if (!env.ANTHROPIC_API_KEY) {
    return [
      `${input.texto.slice(0, 40)}… con distribución bilateral`,
      `${input.texto.slice(0, 40)}… de inicio en la infancia`,
      `${input.texto.slice(0, 40)}… asociado a factores desencadenantes`,
    ];
  }

  const client = getClient();

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages:   [{
        role:    'user',
        content: `El dermatólogo está escribiendo durante una consulta: "${input.texto}"
${input.contextoCaso?.sintomas ? `Contexto del caso: ${input.contextoCaso.sintomas}` : ''}

Genera 3 autocompletados o preguntas clínicas breves (máx 10 palabras cada una).
Responde SÓLO con JSON array: ["sugerencia1", "sugerencia2", "sugerencia3"]`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const raw       = textBlock?.type === 'text' ? textBlock.text.trim() : '[]';
    const cleaned   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned) as string[];
  } catch {
    return [];
  }
}

// ── generarReporte — reporte clínico Markdown ─────────────────────────────────

export async function generarReporte(casoId: string, _userId: string): Promise<string> {
  const sesion = await ChatSessionModel.findByCasoId(casoId);

  if (!sesion || sesion.mensajes.length === 0) {
    throw new Error('No hay historial de consulta para generar el reporte.');
  }

  const transcripcion = sesion.mensajes
    .map(m =>
      `**[${m.role === 'user' ? '👨‍⚕️ MÉDICO' : '🤖 ASISTENTE IA'}]** *(${new Date(m.timestamp).toLocaleTimeString('es-ES')})*\n${m.contenido}`,
    )
    .join('\n\n---\n\n');

  if (!env.ANTHROPIC_API_KEY) {
    return `# Reporte de Consulta Dermatológica

**Fecha:** ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
**Caso ID:** ${casoId}
**Modo:** Demo (sin API key)
**Total tokens usados:** ${sesion.totalTokens}

## Resumen Ejecutivo

Consulta con asistencia de IA registrada. ${sesion.mensajes.length} intercambios. Sesión ${sesion.guardada ? 'guardada' : 'no guardada'}.

## Transcripción de la Consulta

${transcripcion}

---
*Reporte generado automáticamente por Derma Copilot. Para uso interno del profesional médico.*`;
  }

  const client = getClient();
  const response = await client.messages.create({
    model:      env.ANTHROPIC_MODEL as string,
    max_tokens: 2048,
    messages:   [{
      role:    'user',
      content: `Genera un reporte clínico estructurado y profesional en Markdown a partir de esta consulta dermatológica asistida por IA.

TRANSCRIPCIÓN:
${transcripcion}

INSTRUCCIONES:
- Formato: Markdown con headers (#, ##, ###)
- Secciones: Resumen Ejecutivo, Hallazgos Clínicos, Diagnósticos Considerados, Plan de Manejo, Seguimiento, Observaciones del Asistente IA
- Tono: clínico y objetivo
- Incluir fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Incluir disclaimer al final
- En español, terminología médica precisa`,
    }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : 'Error al generar reporte.';
}
