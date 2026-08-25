import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import { createUsuario, UpdateUsuarioSchema } from '../models/UsuariosModel.js';

const usuariosCollection = collection(db, 'usuarios');
const dependenciasCollection = collection(db, 'dependencias');

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

const validateDependenciaActual = async (dependenciaActual) => {
  if (!dependenciaActual) {
    return;
  }

  const idsToCheck = [
    dependenciaActual.escuela_o_oficina_id,
    dependenciaActual.departamento_id,
    dependenciaActual.seccion_id,
    ...(dependenciaActual.ancestros || [])
  ].filter(Boolean);

  for (const dependenciaId of idsToCheck) {
    const dependenciaRef = doc(dependenciasCollection, dependenciaId);
    const dependenciaSnap = await getDoc(dependenciaRef);

    if (!dependenciaSnap.exists()) {
      const err = new Error(`La dependencia con id ${dependenciaId} no existe`);
      err.statusCode = 400;
      throw err;
    }
  }
};

export const createUsuarioController = async (req, res) => {
  try {
    const payload = createUsuario(req.body);
    await validateDependenciaActual(payload.dependencia_actual);

    const docRef = await addDoc(usuariosCollection, payload);
    const createdDoc = await getDoc(docRef);

    return res.status(201).json({ id: createdDoc.id, ...createdDoc.data() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const getUsuariosController = async (_req, res) => {
  try {
    const snapshot = await getDocs(usuariosCollection);
    const usuarios = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    return res.status(200).json(usuarios);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getUsuarioByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioRef = doc(usuariosCollection, id);
    const usuarioDoc = await getDoc(usuarioRef);

    if (!usuarioDoc.exists()) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ id: usuarioDoc.id, ...usuarioDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioRef = doc(usuariosCollection, id);
    const usuarioDoc = await getDoc(usuarioRef);

    if (!usuarioDoc.exists()) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const updatePayload = UpdateUsuarioSchema.parse(req.body);
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (updatePayload.dependencia_actual) {
      await validateDependenciaActual(updatePayload.dependencia_actual);
    }

    const dataWithAudit = {
      ...updatePayload,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(usuarioRef, dataWithAudit);
    const updatedDoc = await getDoc(usuarioRef);

    return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const deleteUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioRef = doc(usuariosCollection, id);
    const usuarioDoc = await getDoc(usuarioRef);

    if (!usuarioDoc.exists()) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await deleteDoc(usuarioRef);
    return res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    return handleError(res, error);
  }
};
