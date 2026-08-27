import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import { createPeriodos, UpdatePeriodosSchema } from '../models/PeriodosModel.js';

const periodosCollection = collection(db, 'periodos');

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

export const createPeriodosController = async (req, res) => {
  try {
    const payload = createPeriodos(req.body);
    const periodoRef = doc(periodosCollection, payload.id);
    const existentDoc = await getDoc(periodoRef);

    if (existentDoc.exists()) {
      return res.status(409).json({ message: 'Ya existe ese periodo' });
    }

    await setDoc(periodoRef, payload.data);
    const createdDoc = await getDoc(periodoRef);
    return res.status(201).json({ id: createdDoc.id, ...createdDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getPeriodosController = async (_req, res) => {
  try {
    const snapshot = await getDocs(periodosCollection);
    const periodos = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    return res.status(200).json(periodos);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getPeriodoByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const periodoRef = doc(periodosCollection, id);
    const periodoDoc = await getDoc(periodoRef);

    if (!periodoDoc.exists()) {
      return res.status(404).json({ message: 'Periodo no encontrado' });
    }

    return res.status(200).json({ id: periodoDoc.id, ...periodoDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updatePeriodoController = async (req, res) => {
  try {
    const { id } = req.params;
    const periodoRef = doc(periodosCollection, id);
    const periodoDoc = await getDoc(periodoRef);

    if (!periodoDoc.exists()) {
      return res.status(404).json({ message: 'Periodo no encontrado' });
    }

    const updatePayload = UpdatePeriodosSchema.parse(req.body);
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'periodo')) {
      return res.status(400).json({
        message: 'No se permite actualizar el id del periodo. Elimina y crea un nuevo registro.'
      });
    }

    await updateDoc(periodoRef, updatePayload);
    const updatedDoc = await getDoc(periodoRef);
    return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deletePeriodoController = async (req, res) => {
  try {
    const { id } = req.params;
    const periodoRef = doc(periodosCollection, id);
    const periodoDoc = await getDoc(periodoRef);

    if (!periodoDoc.exists()) {
      return res.status(404).json({ message: 'Periodo no encontrado' });
    }

    const linkedDocentePeriodos = await getDocs(
      query(collection(db, 'docente_periodos'), where('periodo_id', '==', id))
    );

    if (!linkedDocentePeriodos.empty) {
      return res.status(409).json({
        message: 'No se puede eliminar: el periodo tiene docentes asociados'
      });
    }

    await deleteDoc(periodoRef);
    return res.status(200).json({ message: 'Periodo eliminado correctamente' });
  } catch (error) {
    return handleError(res, error);
  }
};
