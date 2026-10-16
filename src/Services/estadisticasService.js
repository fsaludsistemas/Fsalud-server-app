import { collection, doc, getDoc, getDocs, setDoc, where, query } from '../config/firestoreRest.js';
import { db } from '../config/firebase.js';

const ID = 'dashboard';
const estadisticasRef = doc(collection(db, 'estadisticas_dashboard'), ID);
const credencialesCollection = collection(db, 'credenciales');
const profesoresCollection = collection(db, 'profesores');
const docentePeriodosCollection = collection(db, 'docente_periodos');

const empty = (periodo = '2026-2') => ({
  periodo_profesores: periodo,
  profesores: { total: 0, por_escuela: {}, por_tipo_vinculacion: {}, por_dedicacion: {}, por_cargo: {}, por_nivel: {} },
  factores: { pregrado: 0, posgrado: 0, categoria: 0, tiempo_parcial: 0, hora_catedra: 0, productividad_academica: 0, premios: 0, patentes: 0, extension_destacada: 0, docencia_destacada: 0 },
  eventos: { total: 0, por_anio: {}, por_clase: {}, por_anio_y_clase: {} },
  actualizado_en: new Date().toISOString()
});

const inc = (map, key, value = 1) => { if (key) map[key] = (map[key] || 0) + value; };

export const resumirCredenciales = (data) => {
  const result = { factores: { ...empty().factores }, eventos: { total: 0, por_anio: {}, por_clase: {}, por_anio_y_clase: {} } };
  result.factores.pregrado = data.titulos_universitarios?.pregrado?.length || 0;
  result.factores.posgrado = data.titulos_universitarios?.posgrado?.length || 0;
  result.factores.categoria = data.historial_categoria?.length || 0;
  result.factores.tiempo_parcial = data.experiencia_calificada?.tiempo_parcial?.length || 0;
  result.factores.hora_catedra = data.experiencia_calificada?.hora_catedra?.length || 0;
  result.factores.productividad_academica = data.productividad_academica?.length || 0;
  result.factores.premios = (data.premios_y_patentes || []).filter(x => x.tipo === 'PREMIO').length;
  result.factores.patentes = (data.premios_y_patentes || []).filter(x => x.tipo === 'PATENTE').length;
  result.factores.extension_destacada = data.extension_destacada?.length || 0;
  result.factores.docencia_destacada = data.docencia_destacada?.length || 0;
  for (const evento of data.eventos_credenciales || []) {
    result.eventos.total += 1;
    const year = new Date(evento.soporte?.fecha).getFullYear();
    if (Number.isFinite(year)) inc(result.eventos.por_anio, String(year));
    inc(result.eventos.por_clase, evento.clase);
    if (Number.isFinite(year)) {
      const yearKey = String(year);
      if (!result.eventos.por_anio_y_clase[yearKey]) result.eventos.por_anio_y_clase[yearKey] = {};
      inc(result.eventos.por_anio_y_clase[yearKey], evento.clase);
    }
  }
  return result;
};

const applyDelta = (target, before, after) => {
  for (const key of Object.keys(after)) target[key] = (target[key] || 0) + after[key] - (before[key] || 0);
};

export const actualizarCredenciales = async (anterior, nuevo) => {
  const snapshot = await getDoc(estadisticasRef);
  const stats = snapshot.exists() ? snapshot.data() : empty();
  stats.eventos = {
    ...empty().eventos,
    ...(stats.eventos || {}),
    por_anio_y_clase: stats.eventos?.por_anio_y_clase || {}
  };
  const before = resumirCredenciales(anterior);
  const after = resumirCredenciales(nuevo);
  applyDelta(stats.factores, before.factores, after.factores);
  stats.eventos.total += after.eventos.total - before.eventos.total;
  applyDelta(stats.eventos.por_anio, before.eventos.por_anio, after.eventos.por_anio);
  applyDelta(stats.eventos.por_clase, before.eventos.por_clase, after.eventos.por_clase);
  for (const year of new Set([...Object.keys(before.eventos.por_anio_y_clase), ...Object.keys(after.eventos.por_anio_y_clase)])) {
    if (!stats.eventos.por_anio_y_clase[year]) stats.eventos.por_anio_y_clase[year] = {};
    applyDelta(stats.eventos.por_anio_y_clase[year], before.eventos.por_anio_y_clase[year] || {}, after.eventos.por_anio_y_clase[year] || {});
  }
  stats.actualizado_en = new Date().toISOString();
  await setDoc(estadisticasRef, stats);
};

export const actualizarDocentePeriodo = async (anterior = {}, nuevo = {}) => {
  const snapshot = await getDoc(estadisticasRef);
  if (!snapshot.exists()) return reconstruirEstadisticas('2026-2');

  const stats = snapshot.data();
  const periodo = stats.periodo_profesores || '2026-2';
  const beforeApplies = anterior.periodo_id === periodo;
  const afterApplies = nuevo.periodo_id === periodo;

  const dimensions = [
    ['por_tipo_vinculacion', 'tipo_vinculacion'],
    ['por_dedicacion', 'dedicacion'],
    ['por_cargo', 'cargo'],
    ['por_nivel', 'nivel']
  ];

  for (const [counter, field] of dimensions) {
    if (beforeApplies && anterior[field]) inc(stats.profesores[counter], anterior[field], -1);
    if (afterApplies && nuevo[field]) inc(stats.profesores[counter], nuevo[field], 1);
  }

  stats.actualizado_en = new Date().toISOString();
  await setDoc(estadisticasRef, stats);
};

export const reconstruirEstadisticas = async (periodo = '2026-2') => {
  const stats = empty(periodo);
  const [profesores, docentes, credenciales] = await Promise.all([
    getDocs(profesoresCollection),
    getDocs(query(docentePeriodosCollection, where('periodo_id', '==', periodo))),
    getDocs(credencialesCollection)
  ]);
  stats.profesores.total = profesores.docs.length;
  for (const item of profesores.docs) inc(stats.profesores.por_escuela, item.data().dependencia_actual?.escuela_o_oficina_id);
  for (const item of docentes.docs) {
    const data = item.data();
    inc(stats.profesores.por_tipo_vinculacion, data.tipo_vinculacion);
    inc(stats.profesores.por_dedicacion, data.dedicacion);
    inc(stats.profesores.por_cargo, data.cargo);
    inc(stats.profesores.por_nivel, data.nivel);
  }
  for (const item of credenciales.docs) {
    const summary = resumirCredenciales(item.data());
    for (const key of Object.keys(stats.factores)) stats.factores[key] += summary.factores[key] || 0;
    stats.eventos.total += summary.eventos.total;
    for (const key of Object.keys(summary.eventos.por_anio)) inc(stats.eventos.por_anio, key, summary.eventos.por_anio[key]);
    for (const key of Object.keys(summary.eventos.por_clase)) inc(stats.eventos.por_clase, key, summary.eventos.por_clase[key]);
    for (const year of Object.keys(summary.eventos.por_anio_y_clase)) {
      if (!stats.eventos.por_anio_y_clase[year]) stats.eventos.por_anio_y_clase[year] = {};
      for (const clase of Object.keys(summary.eventos.por_anio_y_clase[year])) inc(stats.eventos.por_anio_y_clase[year], clase, summary.eventos.por_anio_y_clase[year][clase]);
    }
  }
  await setDoc(estadisticasRef, stats);
  return stats;
};

export const obtenerEstadisticas = async (filters = {}) => {
  const hasFilters = Object.values(filters).some(Boolean);
  if (hasFilters) return calcularEstadisticasFiltradas(filters);
  const snapshot = await getDoc(estadisticasRef);
  return snapshot.exists() ? snapshot.data() : reconstruirEstadisticas();
};

export const calcularEstadisticasFiltradas = async ({ periodo = '2026-2', escuela_id, tipo_vinculacion, dedicacion, cargo, nivel }) => {
  const [profesores, docentes, credenciales] = await Promise.all([
    getDocs(profesoresCollection),
    getDocs(query(docentePeriodosCollection, where('periodo_id', '==', periodo))),
    getDocs(credencialesCollection)
  ]);
  const profesoresMap = new Map(profesores.docs.map(item => [item.id, item.data()]));
  const docentesFiltrados = docentes.docs.filter(item => {
    const data = item.data();
    const profesor = profesoresMap.get(data.profesor_id);
    return (!escuela_id || profesor?.dependencia_actual?.escuela_o_oficina_id === escuela_id)
      && (!tipo_vinculacion || data.tipo_vinculacion === tipo_vinculacion)
      && (!dedicacion || data.dedicacion === dedicacion)
      && (!cargo || data.cargo === cargo)
      && (!nivel || data.nivel === nivel);
  });
  const ids = new Set(docentesFiltrados.map(item => item.data().profesor_id));
  const stats = empty(periodo);
  stats.profesores.total = ids.size;
  for (const item of docentesFiltrados) {
    const data = item.data();
    inc(stats.profesores.por_tipo_vinculacion, data.tipo_vinculacion);
    inc(stats.profesores.por_dedicacion, data.dedicacion);
    inc(stats.profesores.por_cargo, data.cargo);
    inc(stats.profesores.por_nivel, data.nivel);
    inc(stats.profesores.por_escuela, profesoresMap.get(data.profesor_id)?.dependencia_actual?.escuela_o_oficina_id);
  }
  for (const item of credenciales.docs) {
    if (!ids.has(item.data().profesor_id)) continue;
    const summary = resumirCredenciales(item.data());
    for (const key of Object.keys(stats.factores)) stats.factores[key] += summary.factores[key] || 0;
    stats.eventos.total += summary.eventos.total;
    for (const key of Object.keys(summary.eventos.por_anio)) inc(stats.eventos.por_anio, key, summary.eventos.por_anio[key]);
    for (const key of Object.keys(summary.eventos.por_clase)) inc(stats.eventos.por_clase, key, summary.eventos.por_clase[key]);
    for (const year of Object.keys(summary.eventos.por_anio_y_clase)) {
      if (!stats.eventos.por_anio_y_clase[year]) stats.eventos.por_anio_y_clase[year] = {};
      for (const clase of Object.keys(summary.eventos.por_anio_y_clase[year])) inc(stats.eventos.por_anio_y_clase[year], clase, summary.eventos.por_anio_y_clase[year][clase]);
    }
  }
  stats.actualizado_en = new Date().toISOString();
  return stats;
};
