import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import {
  createDocentePeriodo,
  UpdateDocentePeriodoSchema
} from '../models/DocentePeriodoModel.js';

const docentePeriodosCollection = collection(db, 'docente_periodos');
const profesoresCollection = collection(db, 'profesores');

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

export const createDocentePeriodoController = async (req, res) => {
  try {
    const payload = createDocentePeriodo(req.body);
    await validateProfesor(payload.data.profesor_id);

    const docentePeriodoRef = doc(docentePeriodosCollection, payload.id);
    const existentDoc = await getDoc(docentePeriodoRef);

    if (existentDoc.exists()) {
      return res.status(409).json({
        message: 'Ya existe un registro para ese profesor y periodo'
      });
    }

    await setDoc(docentePeriodoRef, payload.data);
    const createdDoc = await getDoc(docentePeriodoRef);

    return res.status(201).json({ id: createdDoc.id, ...createdDoc.data() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const getDocentePeriodosController = async (_req, res) => {
  try {
    const snapshot = await getDocs(docentePeriodosCollection);
    const docentePeriodos = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    return res.status(200).json(docentePeriodos);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getDocentePeriodoByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const docentePeriodoRef = doc(docentePeriodosCollection, id);
    const docentePeriodoDoc = await getDoc(docentePeriodoRef);

    if (!docentePeriodoDoc.exists()) {
      return res.status(404).json({ message: 'DocentePeriodo no encontrado' });
    }

    return res.status(200).json({ id: docentePeriodoDoc.id, ...docentePeriodoDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateDocentePeriodoController = async (req, res) => {
  try {
    const { id } = req.params;
    const docentePeriodoRef = doc(docentePeriodosCollection, id);
    const docentePeriodoDoc = await getDoc(docentePeriodoRef);

    if (!docentePeriodoDoc.exists()) {
      return res.status(404).json({ message: 'DocentePeriodo no encontrado' });
    }

    const updatePayload = UpdateDocentePeriodoSchema.parse(req.body);
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'profesor_id') ||
      Object.prototype.hasOwnProperty.call(updatePayload, 'periodo')) {
      return res.status(400).json({
        message: 'No se permite actualizar profesor_id o periodo. Elimina y crea un nuevo registro.'
      });
    }

    await updateDoc(docentePeriodoRef, updatePayload);
    const updatedDoc = await getDoc(docentePeriodoRef);

    return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteDocentePeriodoController = async (req, res) => {
  try {
    const { id } = req.params;
    const docentePeriodoRef = doc(docentePeriodosCollection, id);
    const docentePeriodoDoc = await getDoc(docentePeriodoRef);

    if (!docentePeriodoDoc.exists()) {
      return res.status(404).json({ message: 'DocentePeriodo no encontrado' });
    }

    await deleteDoc(docentePeriodoRef);
    return res.status(200).json({ message: 'DocentePeriodo eliminado correctamente' });
  } catch (error) {
    return handleError(res, error);
  }
};
