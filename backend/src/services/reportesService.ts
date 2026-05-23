// ─────────────────────────────────────────────────────────────────────────────
// src/services/reportesService.ts — Derma Copilot
//
// Lógica de negocio del módulo de reportes clínicos:
//   · buildDatosEditables  — pre-popula campos desde el caso + consulta
//   · generarHtml          — template HTML con estilos inline
//   · generarPdf           — documento PDF con pdfkit
//   · generarReporte       — orquesta todo y persiste el reporte
//   · actualizarReporte    — regenera HTML + PDF con nuevos datos editables
//   · enviarReporte        — envía por email vía SendGrid (o mock)
// ─────────────────────────────────────────────────────────────────────────────

import PDFDocument           from 'pdfkit';
import sgMail                from '@sendgrid/mail';
import { env }               from '../config/env';
import { CasoModel }         from '../models/Caso';
import { ChatSessionModel }  from '../models/ChatSession';
import { ReporteModel }      from '../models/Reporte';
import type {
  Reporte,
  DatosEditables,
  GenerarReporteInput,
  EnviarReporteInput,
} from '../types/reportes';

// ── Helpers de color ─────────────────────────────────────────────────────────

const COLORS = {
  azulPrimario:  '#1a56db',
  azulClaro:     '#dbeafe',
  azulFondo:     '#eff6ff',
  grisOscuro:    '#1f2937',
  grisMedio:     '#4b5563',
  grisClaro:     '#9ca3af',
  grisBorde:     '#e5e7eb',
  verdeUrgBaja:  '#065f46',
  bgVerdeUrgBaja:'#d1fae5',
  amarilloUrg:   '#78350f',
  bgAmarilloUrg: '#fef3c7',
  naranjaUrg:    '#7c2d12',
  bgNaranjaUrg:  '#ffedd5',
  rojoUrg:       '#7f1d1d',
  bgRojoUrg:     '#fee2e2',
  blanco:        '#ffffff',
};

function urgenciaTextColor(u: string): string {
  switch (u) {
    case 'Baja':    return COLORS.verdeUrgBaja;
    case 'Media':   return COLORS.amarilloUrg;
    case 'Alta':    return COLORS.naranjaUrg;
    case 'Urgente': return COLORS.rojoUrg;
    default:        return COLORS.grisMedio;
  }
}
function urgenciaBgColor(u: string): string {
  switch (u) {
    case 'Baja':    return COLORS.bgVerdeUrgBaja;
    case 'Media':   return COLORS.bgAmarilloUrg;
    case 'Alta':    return COLORS.bgNaranjaUrg;
    case 'Urgente': return COLORS.bgRojoUrg;
    default:        return COLORS.grisBorde;
  }
}
// ── Construir DatosEditables desde el caso + consulta ────────────────────────

async function buildDatosEditables(
  casoId:      string,
  consultaId?: string,
  overrides?:  Partial<DatosEditables>,
): Promise<DatosEditables> {
  const caso   = await CasoModel.findById(casoId);
  const sesion = consultaId
    ? await ChatSessionModel.findByCasoId(consultaId)
    : await ChatSessionModel.findByCasoId(casoId);

  const analisis = caso?.analisis;

  // Plan extraído de la última respuesta del asistente (si hay sesión)
  const ultimaRespuesta = sesion?.mensajes
    .filter(m => m.role === 'assistant')
    .pop()?.contenido ?? '';

  const diagnosticoPrimario = analisis?.diagnosticoDiferencial[0]?.condicion ?? '';
  const diagnosticosSecundarios = analisis?.diagnosticoDiferencial
    .slice(1)
    .map(d => d.condicion) ?? [];

  const defaults: DatosEditables = {
    pacienteNombre:          '',
    pacienteEmail:           '',
    pacienteEdad:            '',
    diagnosticoPrincipal:    diagnosticoPrimario,
    diagnosticosSecundarios,
    hallazgosClinica:        caso?.sintomas ?? '',
    planTratamiento:         analisis?.recomendaciones.join('\n') ?? '',
    medicamentos:            [],
    recomendaciones:         analisis?.recomendaciones ?? [],
    seguimiento:             analisis?.sesionesNecesarias
      ? `${analisis.sesionesNecesarias.cantidad} sesiones – ${analisis.sesionesNecesarias.frecuencia}. ${analisis.sesionesNecesarias.descripcion}`
      : '',
    notasMedico:             ultimaRespuesta
      ? 'Ver historial de consulta asistida adjunto.'
      : analisis?.notasAdicionales ?? '',
  };

  return { ...defaults, ...overrides };
}

// ── Generar HTML preview ──────────────────────────────────────────────────────

export function generarHtml(
  datos:     DatosEditables,
  casoId:    string,
  urgencia?: string,
): string {
  const fecha  = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const folio  = `REP-${casoId.slice(0, 8).toUpperCase()}`;
  const urg    = urgencia ?? 'Media';
  const bgUrg  = urgenciaBgColor(urg);
  const txUrg  = urgenciaTextColor(urg);

  const medicamentosRows = datos.medicamentos.length
    ? datos.medicamentos.map(m => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${m.nombre}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.dosis}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.frecuencia}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.duracion}</td>
          ${m.instrucciones ? `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${m.instrucciones}</td>` : ''}
        </tr>`).join('')
    : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#9ca3af;font-style:italic;">Sin medicamentos prescritos</td></tr>`;

  const dxSecRows = datos.diagnosticosSecundarios
    .filter(d => d.trim())
    .map((d, i) => `<li style="margin:4px 0;color:#4b5563;">${i + 2}. ${d}</li>`)
    .join('');

  const recoRows = datos.recomendaciones
    .filter(r => r.trim())
    .map(r => `<li style="margin:6px 0;color:#1f2937;">${r}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Clínico — ${folio}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           background: #f8fafc; color: #1f2937; font-size: 13px; line-height: 1.5; }
    .page { max-width: 820px; margin: 0 auto; background: #fff; }
    @media print {
      body { background: #fff; }
      .page { max-width: 100%; box-shadow: none; }
      .no-print { display: none !important; }
    }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="background:${COLORS.azulPrimario};padding:28px 36px;color:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;
                      display:flex;align-items:center;justify-content:center;font-size:20px;">🩺</div>
          <span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;">${env.CLINICA_NOMBRE}</span>
        </div>
        <p style="font-size:13px;opacity:0.85;margin-top:2px;">Reporte Clínico Dermatológico</p>
        <p style="font-size:11px;opacity:0.65;margin-top:6px;">
          ${env.CLINICA_DIRECCION} · ${env.CLINICA_TELEFONO} · ${env.CLINICA_EMAIL}
        </p>
      </div>
      <div style="text-align:right;opacity:0.9;">
        <p style="font-size:12px;font-weight:600;">${folio}</p>
        <p style="font-size:11px;margin-top:3px;">${fecha}</p>
      </div>
    </div>
  </div>

  <!-- URGENCIA BANNER -->
  <div style="background:${bgUrg};color:${txUrg};padding:10px 36px;
              font-weight:600;font-size:12px;letter-spacing:0.3px;">
    ⚠️ URGENCIA: ${urg.toUpperCase()}
  </div>

  <!-- DATOS PACIENTE -->
  <div style="padding:24px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">
      Datos del Paciente
    </h2>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
      <div>
        <p style="font-size:10px;color:#9ca3af;margin-bottom:2px;">Nombre completo</p>
        <p style="font-weight:600;">${datos.pacienteNombre || '—'}</p>
      </div>
      <div>
        <p style="font-size:10px;color:#9ca3af;margin-bottom:2px;">Email / Contacto</p>
        <p>${datos.pacienteEmail || '—'}</p>
      </div>
      <div>
        <p style="font-size:10px;color:#9ca3af;margin-bottom:2px;">Edad / Género</p>
        <p>${datos.pacienteEdad || '—'}</p>
      </div>
    </div>
  </div>

  <!-- HALLAZGOS CLÍNICOS -->
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
      Hallazgos Clínicos
    </h2>
    <div style="background:${COLORS.azulFondo};border-radius:8px;padding:14px 16px;
                border-left:3px solid ${COLORS.azulPrimario};">
      <p style="white-space:pre-wrap;color:#374151;line-height:1.6;">${datos.hallazgosClinica || '—'}</p>
    </div>
  </div>

  <!-- DIAGNÓSTICO DIFERENCIAL -->
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">
      Diagnóstico Diferencial
    </h2>
    <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;
                border-left:3px solid #16a34a;margin-bottom:10px;">
      <p style="font-size:10px;color:#15803d;font-weight:700;margin-bottom:3px;">
        DIAGNÓSTICO PRINCIPAL
      </p>
      <p style="font-weight:700;font-size:14px;color:#14532d;">
        1. ${datos.diagnosticoPrincipal || '—'}
      </p>
    </div>
    ${dxSecRows ? `<ul style="list-style:none;padding:0;">${dxSecRows}</ul>` : ''}
  </div>

  <!-- PLAN DE TRATAMIENTO -->
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
      Plan de Tratamiento
    </h2>
    <p style="white-space:pre-wrap;color:#374151;line-height:1.7;">${datos.planTratamiento || '—'}</p>
  </div>

  <!-- MEDICAMENTOS -->
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">
      Medicamentos Prescritos
    </h2>
    <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#374151;">Medicamento</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#374151;">Dosis</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#374151;">Frecuencia</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#374151;">Duración</th>
        </tr>
      </thead>
      <tbody>${medicamentosRows}</tbody>
    </table>
  </div>

  <!-- RECOMENDACIONES -->
  ${datos.recomendaciones.length ? `
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
      Recomendaciones Clínicas
    </h2>
    <ul style="list-style:none;padding:0;">${recoRows}</ul>
  </div>` : ''}

  <!-- SEGUIMIENTO -->
  ${datos.seguimiento ? `
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
      Plan de Seguimiento
    </h2>
    <p style="color:#374151;">${datos.seguimiento}</p>
  </div>` : ''}

  <!-- NOTAS DEL MÉDICO -->
  ${datos.notasMedico ? `
  <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
    <h2 style="font-size:11px;font-weight:700;color:#9ca3af;
               text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
      Notas del Médico
    </h2>
    <p style="white-space:pre-wrap;color:#374151;font-style:italic;">${datos.notasMedico}</p>
  </div>` : ''}

  <!-- FIRMA -->
  <div style="padding:28px 36px;display:grid;grid-template-columns:1fr 1fr;gap:32px;">
    <div>
      <div style="border-top:1.5px solid #374151;width:220px;margin-bottom:6px;margin-top:48px;"></div>
      <p style="font-weight:700;color:#1f2937;">${env.CLINICA_MEDICO}</p>
      <p style="font-size:11px;color:#6b7280;">Dermatólogo Certificado</p>
      ${env.CLINICA_CEDULA ? `<p style="font-size:11px;color:#9ca3af;">Cédula: ${env.CLINICA_CEDULA}</p>` : ''}
    </div>
    <div>
      <div style="border-top:1.5px solid #374151;width:220px;margin-bottom:6px;margin-top:48px;"></div>
      <p style="font-weight:600;color:#374151;">Firma del Paciente</p>
      <p style="font-size:11px;color:#6b7280;">He recibido y entendido las indicaciones</p>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;
              padding:14px 36px;text-align:center;">
    <p style="font-size:10px;color:#9ca3af;">
      <strong style="color:#6b7280;">${env.CLINICA_NOMBRE}</strong> ·
      Folio: ${folio} · Generado: ${new Date().toLocaleString('es-ES')}
    </p>
    <p style="font-size:10px;color:#d1d5db;margin-top:4px;">
      Este documento es confidencial. Generado con asistencia de IA clínica — no reemplaza el criterio médico del profesional.
    </p>
  </div>

</div>
</body>
</html>`;
}

// ── Generar PDF con pdfkit ────────────────────────────────────────────────────

async function generarPdf(
  datos:    DatosEditables,
  casoId:   string,
  urgencia: string,
  imagenBase64?: string,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const M = 50;
    const CW = W - M * 2;   // content width
    const fecha  = new Date().toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const folio  = `REP-${casoId.slice(0, 8).toUpperCase()}`;

    // ── Helper functions ──────────────────────────────────────────────────────

    function sectionTitle(label: string) {
      doc.moveDown(0.8);
      const y = doc.y;
      doc.rect(M, y, CW, 18).fill('#eff6ff');
      doc.fillColor('#1a56db')
         .font('Helvetica-Bold')
         .fontSize(8.5)
         .text(label.toUpperCase(), M + 6, y + 4, { width: CW });
      doc.fillColor('#1f2937').font('Helvetica').fontSize(10);
      doc.moveDown(0.9);
    }

    function bodyText(text: string) {
      doc.font('Helvetica').fontSize(10).fillColor('#374151')
         .text(text || '—', M, doc.y, { width: CW });
    }

    function addPage() {
      doc.addPage();
      // Re-draw mini header on continuation pages
      doc.rect(M, M, CW, 14).fill('#1a56db');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
         .text(`${env.CLINICA_NOMBRE} · ${folio} · Continuación`, M + 4, M + 3, { width: CW });
      doc.fillColor('#1f2937').font('Helvetica').fontSize(10);
      doc.y = M + 24;
    }

    function checkPageBreak(needed = 80) {
      if (doc.y + needed > doc.page.height - 80) {
        addPage();
      }
    }

    // ── HEADER BAND ──────────────────────────────────────────────────────────

    doc.rect(M, M, CW, 56).fill('#1a56db');

    // Clinic name
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(16)
       .text(env.CLINICA_NOMBRE, M + 10, M + 8, { width: CW * 0.65 });

    doc.font('Helvetica')
       .fontSize(9)
       .text('Reporte Clínico Dermatológico', M + 10, M + 29, { width: CW * 0.65 });

    doc.font('Helvetica')
       .fontSize(7.5)
       .text(`${env.CLINICA_DIRECCION} · ${env.CLINICA_TELEFONO}`, M + 10, M + 42, { width: CW * 0.65 });

    // Folio + date (right side)
    doc.font('Helvetica-Bold').fontSize(9)
       .text(folio, M + CW * 0.68, M + 10, { width: CW * 0.3, align: 'right' });
    doc.font('Helvetica').fontSize(8)
       .text(fecha, M + CW * 0.68, M + 24, { width: CW * 0.3, align: 'right' });

    doc.fillColor('#1f2937').font('Helvetica').fontSize(10);
    doc.y = M + 70;

    // ── URGENCIA BANNER ───────────────────────────────────────────────────────

    const urgBg  = { 'Baja': '#d1fae5', 'Media': '#fef3c7', 'Alta': '#ffedd5', 'Urgente': '#fee2e2' }[urgencia] ?? '#f3f4f6';
    const urgTx  = { 'Baja': '#065f46', 'Media': '#78350f', 'Alta': '#7c2d12', 'Urgente': '#7f1d1d' }[urgencia] ?? '#374151';

    doc.rect(M, doc.y, CW, 16).fill(urgBg);
    doc.fillColor(urgTx).font('Helvetica-Bold').fontSize(8.5)
       .text(`URGENCIA: ${urgencia.toUpperCase()}`, M + 8, doc.y + 3, { width: CW });
    doc.fillColor('#1f2937').font('Helvetica').fontSize(10);
    doc.y += 26;

    // ── DATOS DEL PACIENTE ────────────────────────────────────────────────────

    sectionTitle('Datos del Paciente');

    const colW = CW / 3;
    const rowY = doc.y;

    function labelValue(label: string, value: string, x: number, y: number, w: number) {
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(7)
         .text(label, x, y, { width: w });
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10)
         .text(value || '—', x, y + 9, { width: w });
    }

    labelValue('NOMBRE COMPLETO', datos.pacienteNombre, M,           rowY, colW - 10);
    labelValue('EMAIL / CONTACTO', datos.pacienteEmail, M + colW,    rowY, colW - 10);
    labelValue('EDAD / GÉNERO',    datos.pacienteEdad,  M + colW * 2, rowY, colW - 10);

    doc.y = rowY + 32;
    doc.fillColor('#1f2937').font('Helvetica').fontSize(10);

    // ── HALLAZGOS CLÍNICOS ────────────────────────────────────────────────────

    checkPageBreak(100);
    sectionTitle('Hallazgos Clínicos');

    const hallazgosY = doc.y;
    const hallazgosLines = datos.hallazgosClinica
      ? Math.ceil(datos.hallazgosClinica.length / 80)
      : 1;
    const hallazgosH = Math.max(40, hallazgosLines * 14 + 20);

    doc.rect(M, hallazgosY, CW, hallazgosH).fill('#eff6ff');
    doc.rect(M, hallazgosY, 3, hallazgosH).fill('#1a56db');
    doc.fillColor('#374151').font('Helvetica').fontSize(10)
       .text(datos.hallazgosClinica || '—', M + 10, hallazgosY + 8, {
         width: CW - 16, lineGap: 2,
       });
    doc.y = hallazgosY + hallazgosH + 10;

    // ── FOTO DEL CASO ─────────────────────────────────────────────────────────

    if (imagenBase64) {
      checkPageBreak(160);
      sectionTitle('Imagen del Caso');
      try {
        const imgBuffer = Buffer.from(imagenBase64, 'base64');
        doc.image(imgBuffer, M, doc.y, { fit: [180, 180] });
        doc.y += 190;
      } catch { /* ignorar si la imagen es inválida */ }
    }

    // ── DIAGNÓSTICO DIFERENCIAL ───────────────────────────────────────────────

    checkPageBreak(60);
    sectionTitle('Diagnóstico Diferencial');

    // Diagnóstico principal
    const dxY = doc.y;
    doc.rect(M, dxY, CW, 26).fill('#f0fdf4');
    doc.rect(M, dxY, 3, 26).fill('#16a34a');
    doc.fillColor('#166534').font('Helvetica-Bold').fontSize(7)
       .text('DIAGNÓSTICO PRINCIPAL', M + 8, dxY + 3, { width: CW });
    doc.fillColor('#14532d').font('Helvetica-Bold').fontSize(11)
       .text(`1.  ${datos.diagnosticoPrincipal || '—'}`, M + 8, dxY + 12, { width: CW });
    doc.y = dxY + 36;

    // Diagnósticos secundarios
    datos.diagnosticosSecundarios
      .filter(d => d.trim())
      .forEach((dx, i) => {
        checkPageBreak(16);
        doc.fillColor('#4b5563').font('Helvetica').fontSize(10)
           .text(`${i + 2}.  ${dx}`, M + 8, doc.y, { width: CW });
        doc.moveDown(0.3);
      });

    doc.moveDown(0.4);

    // ── PLAN DE TRATAMIENTO ───────────────────────────────────────────────────

    checkPageBreak(60);
    sectionTitle('Plan de Tratamiento');
    bodyText(datos.planTratamiento);
    doc.moveDown(0.3);

    // ── MEDICAMENTOS ──────────────────────────────────────────────────────────

    checkPageBreak(60);
    sectionTitle('Medicamentos Prescritos');

    if (datos.medicamentos.length === 0) {
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(9)
         .text('Sin medicamentos prescritos.', M, doc.y, { width: CW });
      doc.moveDown(0.5);
    } else {
      // Table header
      const colsW = [CW * 0.3, CW * 0.15, CW * 0.25, CW * 0.15, CW * 0.15];
      const heads = ['Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Instrucciones'];
      const thY = doc.y;

      doc.rect(M, thY, CW, 16).fill('#f9fafb');
      doc.rect(M, thY, CW, 16).stroke('#e5e7eb');

      let cx = M;
      heads.forEach((h, i) => {
        doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8)
           .text(h, cx + 4, thY + 4, { width: colsW[i] - 4 });
        cx += colsW[i];
      });
      doc.y = thY + 18;

      // Table rows
      datos.medicamentos.forEach((m, idx) => {
        checkPageBreak(18);
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        const ry = doc.y;
        doc.rect(M, ry, CW, 14).fill(rowBg).stroke('#e5e7eb');

        let rcx = M;
        const vals = [m.nombre, m.dosis, m.frecuencia, m.duracion, m.instrucciones ?? ''];
        vals.forEach((v, i) => {
          const isBold = i === 0;
          doc.fillColor('#1f2937')
             .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(9)
             .text(v, rcx + 4, ry + 2, { width: colsW[i] - 6 });
          rcx += colsW[i];
        });
        doc.y = ry + 16;
      });
      doc.moveDown(0.4);
    }

    // ── RECOMENDACIONES ───────────────────────────────────────────────────────

    if (datos.recomendaciones.length) {
      checkPageBreak(50);
      sectionTitle('Recomendaciones Clínicas');

      datos.recomendaciones.filter(r => r.trim()).forEach(r => {
        checkPageBreak(14);
        doc.fillColor('#374151').font('Helvetica').fontSize(10)
           .text(`•  ${r}`, M + 6, doc.y, { width: CW - 6 });
        doc.moveDown(0.2);
      });
    }

    // ── SEGUIMIENTO ───────────────────────────────────────────────────────────

    if (datos.seguimiento) {
      checkPageBreak(40);
      sectionTitle('Plan de Seguimiento');
      bodyText(datos.seguimiento);
    }

    // ── NOTAS DEL MÉDICO ──────────────────────────────────────────────────────

    if (datos.notasMedico) {
      checkPageBreak(40);
      sectionTitle('Notas del Médico');
      doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10)
         .text(datos.notasMedico, M, doc.y, { width: CW });
    }

    // ── FIRMA ─────────────────────────────────────────────────────────────────

    checkPageBreak(90);
    doc.moveDown(1.5);

    const sigY = doc.y;
    const sigColW = (CW / 2) - 20;

    // Firma médico
    doc.moveTo(M, sigY + 40).lineTo(M + sigColW, sigY + 40).stroke('#374151');
    doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(9)
       .text(env.CLINICA_MEDICO, M, sigY + 44, { width: sigColW });
    doc.fillColor('#6b7280').font('Helvetica').fontSize(8)
       .text('Dermatólogo Certificado', M, sigY + 56, { width: sigColW });
    if (env.CLINICA_CEDULA) {
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(7)
         .text(`Cédula: ${env.CLINICA_CEDULA}`, M, sigY + 67, { width: sigColW });
    }

    // Firma paciente
    const sig2X = M + sigColW + 40;
    doc.moveTo(sig2X, sigY + 40).lineTo(sig2X + sigColW, sigY + 40).stroke('#374151');
    doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9)
       .text('Firma del Paciente', sig2X, sigY + 44, { width: sigColW });
    doc.fillColor('#6b7280').font('Helvetica').fontSize(8)
       .text('He recibido y entendido las indicaciones', sig2X, sigY + 56, { width: sigColW });

    // ── FOOTER ────────────────────────────────────────────────────────────────

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      const fY = doc.page.height - 38;
      doc.moveTo(M, fY).lineTo(W - M, fY).stroke('#e5e7eb');
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(7.5)
         .text(
           `${env.CLINICA_NOMBRE}  ·  Folio: ${folio}  ·  Generado: ${new Date().toLocaleString('es-ES')}  ·  Pág. ${i + 1}/${pageCount}`,
           M, fY + 4, { width: CW, align: 'center' },
         );
      doc.fillColor('#d1d5db').fontSize(6.5)
         .text(
           'Documento confidencial generado con asistencia de IA — no reemplaza el criterio médico del profesional.',
           M, fY + 16, { width: CW, align: 'center' },
         );
    }

    doc.end();
  });
}

// ── API pública del servicio ──────────────────────────────────────────────────

export async function generarReporte(
  input:  GenerarReporteInput,
  userId: string,
): Promise<Reporte> {
  const caso = await CasoModel.findById(input.casoId);

  const datosEditables = await buildDatosEditables(
    input.casoId,
    input.consultaId,
    input.datosEditables,
  );

  const urgencia = caso?.analisis?.urgencia ?? 'Media';

  const [html, pdf] = await Promise.all([
    Promise.resolve(generarHtml(datosEditables, input.casoId, urgencia)),
    generarPdf(datosEditables, input.casoId, urgencia, caso?.imagenBase64),
  ]);

  return ReporteModel.create({
    casoId:         input.casoId,
    consultaId:     input.consultaId,
    userId,
    datosEditables,
    contenidoHtml:  html,
    pdfBuffer:      pdf,
  });
}

export async function actualizarReporte(
  reporteId:     string,
  datosEditables: DatosEditables,
  casoId:        string,
  urgencia?:     string,
  imagenBase64?: string,
): Promise<Reporte> {
  const urg = urgencia ?? 'Media';
  const [html, pdf] = await Promise.all([
    Promise.resolve(generarHtml(datosEditables, casoId, urg)),
    generarPdf(datosEditables, casoId, urg, imagenBase64),
  ]);
  return ReporteModel.update(reporteId, {
    datosEditables,
    contenidoHtml: html,
    pdfBuffer:     pdf,
  });
}

export async function enviarReporte(
  reporteId: string,
  input:     EnviarReporteInput,
): Promise<void> {
  const reporte = await ReporteModel.findById(reporteId);
  if (!reporte) throw new Error('Reporte no encontrado.');

  const pdfBuffer = ReporteModel.getPdfBuffer(reporteId);
  const folio     = `REP-${reporte.casoId.slice(0, 8).toUpperCase()}`;

  // ── Mock cuando no hay SendGrid API key ──────────────────────────────────────
  if (!env.SENDGRID_API_KEY) {
    console.log(`[MOCK EMAIL] Reporte ${folio} enviado a: ${input.emailDestino}`);
    console.log(`  Paciente: ${input.nombrePaciente ?? 'N/A'}`);
    console.log(`  PDF buffer: ${pdfBuffer?.length ?? 0} bytes`);
    await ReporteModel.marcarEnviado(reporteId, input.emailDestino);
    return;
  }

  // ── Envío real vía SendGrid ──────────────────────────────────────────────────
  sgMail.setApiKey(env.SENDGRID_API_KEY);

  const pdfBase64 = pdfBuffer?.toString('base64') ?? '';

  await sgMail.send({
    to:   input.emailDestino,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
    subject: `Reporte de consulta dermatológica · ${folio}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a56db;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">🩺 ${env.CLINICA_NOMBRE}</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Reporte Clínico Dermatológico</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
          <p>Estimado/a ${input.nombrePaciente ?? 'paciente'},</p>
          <p>Adjunto encontrará su reporte clínico dermatológico <strong>${folio}</strong> generado durante su consulta.</p>
          <p>Si tiene alguna pregunta sobre su diagnóstico o plan de tratamiento, comuníquese con nuestra clínica.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="font-size:12px;color:#6b7280;">
            ${env.CLINICA_NOMBRE} · ${env.CLINICA_TELEFONO} · ${env.CLINICA_EMAIL}
          </p>
          <p style="font-size:11px;color:#9ca3af;margin-top:8px;">
            Este correo y su adjunto son confidenciales. Generado con asistencia de IA clínica.
          </p>
        </div>
      </div>`,
    attachments: pdfBase64
      ? [{
          content:     pdfBase64,
          filename:    `reporte-dermatologico-${folio}.pdf`,
          type:        'application/pdf',
          disposition: 'attachment',
        }]
      : [],
  });

  await ReporteModel.marcarEnviado(reporteId, input.emailDestino);
}
