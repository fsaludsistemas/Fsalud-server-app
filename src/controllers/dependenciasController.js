import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import { createDependencia, UpdateDependenciaSchema } from '../models/DependenciaModel.js';

const dependenciasCollection = collection(db, 'dependencias');
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

const buildAncestros = async (padreId, incomingAncestros = []) => {
  if (!padreId) {
    return incomingAncestros;
  }

  const padreRef = doc(dependenciasCollection, padreId);
  const padreDoc = await getDoc(padreRef);

  if (!padreDoc.exists()) {
    const err = new Error('La dependencia padre no existe');
    err.statusCode = 400;
    throw err;
  }

  const padreData = padreDoc.data();
  return [...(padreData.ancestros || []), padreDoc.id];
};

export const createDependenciaController = async (req, res) => {
  try {
    const payload = createDependencia(req.body);
    const ancestros = await buildAncestros(payload.padre_id, payload.ancestros);

    const createdRef = await addDoc(dependenciasCollection, {
      ...payload,
      ancestros
    });

    const createdDoc = await getDoc(createdRef);
    return res.status(201).json({ id: createdRef.id, ...createdDoc.data() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const getDependenciasController = async (_req, res) => {
  try {
    const snapshot = await getDocs(dependenciasCollection);
    const dependencias = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    return res.status(200).json(dependencias);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getDependenciaByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const dependenciaRef = doc(dependenciasCollection, id);
    const dependenciaDoc = await getDoc(dependenciaRef);

    if (!dependenciaDoc.exists()) {
      return res.status(404).json({ message: 'Dependencia no encontrada' });
    }

    return res.status(200).json({ id: dependenciaDoc.id, ...dependenciaDoc.data() });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateDependenciaController = async (req, res) => {
  try {
    const { id } = req.params;
    const dependenciaRef = doc(dependenciasCollection, id);
    const dependenciaDoc = await getDoc(dependenciaRef);

    if (!dependenciaDoc.exists()) {
      return res.status(404).json({ message: 'Dependencia no encontrada' });
    }

    const updatePayload = UpdateDependenciaSchema.parse(req.body);
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'padre_id')) {
      updatePayload.ancestros = await buildAncestros(updatePayload.padre_id, updatePayload.ancestros || []);
    }

    await updateDoc(dependenciaRef, updatePayload);
    const updatedDoc = await getDoc(dependenciaRef);

    return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const deleteDependenciaController = async (req, res) => {
  try {
    const { id } = req.params;
    const dependenciaRef = doc(dependenciasCollection, id);
    const dependenciaDoc = await getDoc(dependenciaRef);

    if (!dependenciaDoc.exists()) {
      return res.status(404).json({ message: 'Dependencia no encontrada' });
    }

    const childrenQuery = query(dependenciasCollection, where('padre_id', '==', id));
    const childrenResult = await getDocs(childrenQuery);

    if (!childrenResult.empty) {
      return res.status(409).json({
        message: 'No se puede eliminar: existen dependencias hijas asociadas'
      });
    }

    const profesoresEscuelaQuery = query(
      profesoresCollection,
      where('dependencia_actual.escuela_o_oficina_id', '==', id)
    );
    const profesoresDepartamentoQuery = query(
      profesoresCollection,
      where('dependencia_actual.departamento_id', '==', id)
    );
    const profesoresSeccionQuery = query(
      profesoresCollection,
      where('dependencia_actual.seccion_id', '==', id)
    );

    const [escuelaResult, departamentoResult, seccionResult] = await Promise.all([
      getDocs(profesoresEscuelaQuery),
      getDocs(profesoresDepartamentoQuery),
      getDocs(profesoresSeccionQuery)
    ]);

    if (!escuelaResult.empty || !departamentoResult.empty || !seccionResult.empty) {
      return res.status(409).json({
        message: 'No se puede eliminar: la dependencia esta asociada a profesores'
      });
    }

    await deleteDoc(dependenciaRef);
    return res.status(200).json({ message: 'Dependencia eliminada correctamente' });
  } catch (error) {
    return handleError(res, error);
  }
};
