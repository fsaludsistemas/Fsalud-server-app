import 'dotenv/config';
import crypto from 'node:crypto';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { createDocentePeriodo } from '../models/DocentePeriodoModel.js';
import { createAsignacionesDocente } from '../models/AsignacionesModel.js';

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
const spreadsheetId = process.env.GOOGLE_ASIGNACIONES_SHEET_ID || process.env.GOOGLE_SHEET_ID;
const periods = new Set((process.env.PERIODOS || '').split(',').map((p) => p.trim()).filter(Boolean));
const limit = Number.parseInt(process.env.LIMIT_RECORDS || '0', 10);
const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// google-spreadsheet v5 guarda la hoja en _worksheet, no en _sheet.
// Se usa únicamente para resolver encabezados con acentos/espacios.
const valueOf = (row, name) => { const h = row._worksheet?.headerValues?.find((x) => normalize(x) === normalize(name)); return h ? row.get(h) : ''; };
const text = (v) => String(v ?? '').trim();
const numberOf = (v) => { const n = Number.parseFloat(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : undefined; };
const hash = (data) => crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex');

async function main() {
  if (!email || !privateKey || !spreadsheetId) throw new Error('Faltan credenciales o GOOGLE_ASIGNACIONES_SHEET_ID/GOOGLE_SHEET_ID.');
  const auth = new JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const spreadsheet = new GoogleSpreadsheet(spreadsheetId, auth); await spreadsheet.loadInfo();
  const [profSnap, periodSnap] = await Promise.all([getDocs(collection(db, 'profesores')), getDocs(collection(db, 'periodos'))]);
  const professors = new Map(profSnap.docs.map((x) => [text(x.data().numero_identificacion), x.id]));
  const validPeriods = new Set(periodSnap.docs.map((x) => x.id));
  const sheets = spreadsheet.sheetsByIndex.filter((s) => !periods.size || periods.has(text(s.title)));
  if (!sheets.length) throw new Error('No se encontraron hojas para los períodos solicitados.');
  let dpCount = 0; let assignmentCount = 0; let skipped = 0; let errors = 0;
  const missingProfessors = new Set();
  for (const sheet of sheets) {
    const period = text(sheet.title);
    if (!validPeriods.has(period)) { console.warn(`Omitida hoja ${period}: período inexistente.`); continue; }
    let rows = await sheet.getRows(); if (limit > 0) rows = rows.slice(0, limit);
    const assignmentOccurrences = new Map();
    for (const row of rows) {
      try {
        const cedula = text(valueOf(row, 'cedula')); 
        const profesorId = professors.get(cedula);
        if (!profesorId) {
          skipped++;
          if (!missingProfessors.has(cedula)) {
            missingProfessors.add(cedula);
            console.warn(`Docente no encontrado: ${cedula}`);
          }
          continue;
        }
        const rowPeriod = text(valueOf(row, 'Período')) || period;
        if (rowPeriod !== period) throw new Error(`Período de fila (${rowPeriod}) distinto al de la hoja (${period})`);
        const dp = createDocentePeriodo({ profesor_id: profesorId, periodo_id: period, tipo_vinculacion: text(valueOf(row, 'Vinculación')), dedicacion: text(valueOf(row, 'Dedicación')), cargo: text(valueOf(row, 'Cargo')), nivel: text(valueOf(row, 'Nivel')), estado: 'ACTIVO' });
        await setDoc(doc(db, 'docente_periodos', dp.id), dp.data, { merge: true }); dpCount++;
        const assignmentFields = { profesor_id: profesorId, docente_periodo_id: dp.id, tipo_actividad: text(valueOf(row, 'Tipo de Actividad')), actividad: text(valueOf(row, 'Actividad')), nombre_actividad: text(valueOf(row, 'Nombre de actividad')) || undefined, detalle_actividad: text(valueOf(row, 'Detalle actividad')) || undefined, numero_horas: numberOf(valueOf(row, 'Número de horas')), categoria: text(valueOf(row, 'Categoría')) || undefined };
        const assignment = createAsignacionesDocente(assignmentFields);
        // No incluir createdAt/updatedAt en el hash: cambian en cada ejecución.
        // Mantener el ID antiguo para la primera ocurrencia evita duplicar datos
        // cargados antes de agregar soporte para filas idénticas.
        const occurrenceKey = JSON.stringify({ cedula, ...assignmentFields });
        const occurrence = assignmentOccurrences.get(occurrenceKey) || 0;
        assignmentOccurrences.set(occurrenceKey, occurrence + 1);
        const assignmentId = occurrence === 0
          ? hash({ period, cedula, ...assignmentFields })
          : hash({ period, cedula, occurrence, ...assignmentFields });
        await setDoc(doc(db, 'asignaciones', assignmentId), assignment.data, { merge: true }); assignmentCount++;
      } catch (error) { errors++; console.error(`Error en ${period}, cédula ${valueOf(row, 'cedula')}: ${error.message}`); }
    }
  }
  console.log(`Carga terminada. Docente-períodos: ${dpCount} | Asignaciones: ${assignmentCount} | Omitidos: ${skipped} | Errores: ${errors}`);
}
main().catch((error) => { console.error('Error fatal:', error); process.exitCode = 1; });
