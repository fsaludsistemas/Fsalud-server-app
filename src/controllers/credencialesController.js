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
  createCredenciales,
  UpdateCredencialesSchema
} from '../models/CredencialesModels.js';
import PuntajeService from '../Services/PuntajeService.js';

const credencialesCollection = collection(db, 'credenciales');
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

const toResponse = (docSnap) => ({
  id: docSnap.id,
  ...docSnap.data()
});

export const createCredencialesController = async (req, res) => {
  try {
    const payload = createCredenciales(req.body);
    await validateProfesor(payload.profesor_id);

    const credencialesRef = doc(credencialesCollection, payload.profesor_id);
    const existentDoc = await getDoc(credencialesRef);

    if (existentDoc.exists()) {
      return res.status(409).json({
        message: 'Ya existen credenciales para ese profesor'
      });
    }

    const credencialesCalculadas = PuntajeService.procesarCredenciales(payload);

    await setDoc(credencialesRef, credencialesCalculadas);
    const createdDoc = await getDoc(credencialesRef);
    return res.status(201).json(toResponse(createdDoc));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const getCredencialesController = async (_req, res) => {
  try {
    const snapshot = await getDocs(credencialesCollection);
    const credenciales = snapshot.docs.map(toResponse);
    return res.status(200).json(credenciales);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getCredencialesByProfesorController = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const credencialesRef = doc(credencialesCollection, profesorId);
    const credencialesDoc = await getDoc(credencialesRef);

    if (!credencialesDoc.exists()) {
      return res.status(404).json({ message: 'Credenciales no encontradas' });
    }

    return res.status(200).json(toResponse(credencialesDoc));
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateCredencialesController = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const credencialesRef = doc(credencialesCollection, profesorId);
    const credencialesDoc = await getDoc(credencialesRef);

    if (!credencialesDoc.exists()) {
      return res.status(404).json({ message: 'Credenciales no encontradas' });
    }

    const updatePayload = UpdateCredencialesSchema.parse(req.body);
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'profesor_id')) {
      return res.status(400).json({
        message: 'No se permite actualizar profesor_id. Elimina y crea un nuevo registro.'
      });
    }

    const currentData = credencialesDoc.data();
    const mergedData = {
      ...currentData,
      ...updatePayload,
      titulos_universitarios: {
        ...currentData.titulos_universitarios,
        ...updatePayload.titulos_universitarios
      },
      experiencia_calificada: {
        ...currentData.experiencia_calificada,
        ...updatePayload.experiencia_calificada
      }
    };
    const credencialesCalculadas = PuntajeService.procesarCredenciales(mergedData);

    await updateDoc(credencialesRef, {
      ...credencialesCalculadas,
      updatedAt: new Date().toISOString()
    });
    const updatedDoc = await getDoc(credencialesRef);
    return res.status(200).json(toResponse(updatedDoc));
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteCredencialesController = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const credencialesRef = doc(credencialesCollection, profesorId);
    const credencialesDoc = await getDoc(credencialesRef);

    if (!credencialesDoc.exists()) {
      return res.status(404).json({ message: 'Credenciales no encontradas' });
    }

    await deleteDoc(credencialesRef);
    return res.status(200).json({ message: 'Credenciales eliminadas correctamente' });
  } catch (error) {
    return handleError(res, error);
  }
};
