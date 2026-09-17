import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import {
  createAsignacionesDocente,
  UpdateAsignacionesDocenteSchema
} from '../models/AsignacionesModel.js';

const docentePeriodosCollection = collection(db, 'docente_periodos');
const profesoresCollection = collection(db, 'profesores');
const asignacionesCollection = collection(db, 'asignaciones');

const handleError = (res, error) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Error de validacion',
      errors: error.issues
    });
  }

  return res.status(500).json({
    message: 'Error interno del servidor',
    error: error.message
  });
};

const validateProfesor = async (profesorId) => {
  const profesorRef = doc(profesoresCollection, profesorId);
  const profesorDoc = await getDoc(profesorRef);

  if (!profesorDoc.exists()) {
    const err = new Error('El profesor asociado no existe');
    err.statusCode = 400;
    throw err;
  }
};

const validateDocentePeriodo = async (docente_periodoId) => {
  const periodoRef = doc(docentePeriodosCollection, docente_periodoId);
  const periodoDoc = await getDoc(periodoRef);

  if (!periodoDoc.exists()) {
    const err = new Error('El periodo asociado no existe');
    err.statusCode = 400;
    throw err;
  }
};

const enrichAsignaciones = async (docSnap) => {
  const data = docSnap.data();
  const docentePeriodoRef = doc(docentePeriodosCollection, data.docente_periodo_id);
  const docentePeriodoDoc = await getDoc(docentePeriodoRef);

  return {
    id: docSnap.id,
    ...data,
    periodo: docentePeriodoDoc.exists() ? { id: docentePeriodoDoc.id, ...docentePeriodoDoc.data() } : null
  };
};

export const createAsignacionesController = async (req, res) => {
  try {
    const payload = createAsignacionesDocente(req.body);
    await validateProfesor(payload.data.profesor_id);
    await validateDocentePeriodo(payload.data.docente_periodo_id);

    const asignacionesRef = await addDoc(asignacionesCollection, payload.data);
    const createdDoc = await getDoc(asignacionesRef);
    return res.status(201).json(await enrichAsignaciones(createdDoc));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const getAsignacionesController = async (_req, res) => {
  try {
    const snapshot = await getDocs(asignacionesCollection);
    const asignaciones = await Promise.all(snapshot.docs.map((item) => enrichAsignaciones(item)));
    return res.status(200).json(asignaciones);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getAsignacionesByProfesorController = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const asignacionesQuery = query(
      asignacionesCollection,
      where('profesor_id', '==', profesorId)
    );
    const snapshot = await getDocs(asignacionesQuery);
    const asignaciones = await Promise.all(snapshot.docs.map((item) => enrichAsignaciones(item)));

    return res.status(200).json(asignaciones);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getResumenHorasController = async (req, res) => {
  try {
    const { docente_periodo_id, categoria, tipo_actividad } = req.query;

    if (!docente_periodo_id) {
      return res.status(400).json({
        message: 'El parametro docente_periodo_id es obligatorio'
      });
    }

    const asignacionesQuery = query(
      asignacionesCollection,
      where('docente_periodo_id', '==', docente_periodo_id)
    );
    const snapshot = await getDocs(asignacionesQuery);
    const asignaciones = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((asignacion) => !categoria || asignacion.categoria === categoria)
      .filter((asignacion) => !tipo_actividad || asignacion.tipo_actividad === tipo_actividad);

    const horasPorCategoria = {};
    const horasPorTipoActividad = {};
    const totalHoras = asignaciones.reduce((total, asignacion) => {
      const horas = Number(asignacion.numero_horas) || 0;

      if (asignacion.categoria) {
        horasPorCategoria[asignacion.categoria] =
          (horasPorCategoria[asignacion.categoria] || 0) + horas;
      }

      if (asignacion.tipo_actividad) {
        horasPorTipoActividad[asignacion.tipo_actividad] =
          (horasPorTipoActividad[asignacion.tipo_actividad] || 0) + horas;
      }

      return total + horas;
    }, 0);

    return res.status(200).json({
      docente_periodo_id,
      filtros: { categoria: categoria || null, tipo_actividad: tipo_actividad || null },
      total_horas_periodo: totalHoras,
      horas_por_categoria: horasPorCategoria,
      horas_por_tipo_actividad: horasPorTipoActividad
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getAsignacionesByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const asignacionesRef = doc(asignacionesCollection, id);
    const asignacionesDoc = await getDoc(asignacionesRef);

    if (!asignacionesDoc.exists()) {
      return res.status(404).json({ message: 'Asignaciones no encontradas' });
    }

    return res.status(200).json(await enrichAsignaciones(asignacionesDoc));
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateAsignacionesController = async (req, res) => {
  try {
    const { id } = req.params;
    const asignacionesRef = doc(asignacionesCollection, id);
    const asignacionesDoc = await getDoc(asignacionesRef);

    if (!asignacionesDoc.exists()) {
      return res.status(404).json({ message: 'Asignaciones no encontradas' });
    }

    const updatePayload = UpdateAsignacionesDocenteSchema.parse(req.body);
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'profesor_id') ||
      Object.prototype.hasOwnProperty.call(updatePayload, 'docente_periodo_id')) {
      return res.status(400).json({
        message: 'No se permite actualizar profesor_id o docente_periodo_id. Elimina y crea un nuevo registro.'
      });
    }

    await updateDoc(asignacionesRef, updatePayload);
    const updatedDoc = await getDoc(asignacionesRef);
    return res.status(200).json(await enrichAsignaciones(updatedDoc));
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteAsignacionesController = async (req, res) => {
  try {
    const { id } = req.params;
    const asignacionesRef = doc(asignacionesCollection, id);
    const asignacionesDoc = await getDoc(asignacionesRef);

    if (!asignacionesDoc.exists()) {
      return res.status(404).json({ message: 'Asignaciones no encontradas' });
    }

    await deleteDoc(asignacionesRef);
    return res.status(200).json({ message: 'Asignaciones eliminadas correctamente' });
  } catch (error) {
    return handleError(res, error);
  }
};
