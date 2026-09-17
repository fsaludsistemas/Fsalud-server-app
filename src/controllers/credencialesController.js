import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import {
  createCredenciales,
  CrearEventoCredencialSchema,
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

const getNextEventNumber = (data) => {
  const storedNumber = Number.isInteger(data.ultimo_numero_evento)
    ? data.ultimo_numero_evento
    : 0;
  const highestEventNumber = (data.eventos_credenciales || []).reduce(
    (highest, event) => Math.max(highest, event.numero_evento || 0),
    0
  );
  return Math.max(storedNumber, highestEventNumber) + 1;
};

const addEventNumberToFactors = (payload, eventNumber) => ({
  titulos_universitarios: {
    pregrado: payload.titulos_universitarios.pregrado.map((item) => ({
      ...item,
      evento_no: eventNumber
    })),
    posgrado: payload.titulos_universitarios.posgrado.map((item) => ({
      ...item,
      evento_no: eventNumber
    }))
  },
  historial_categoria: payload.historial_categoria.map((item) => ({
    ...item,
    inclusion_no: eventNumber
  })),
  experiencia_calificada: {
    tiempo_parcial: payload.experiencia_calificada.tiempo_parcial.map((item) => ({
      ...item,
      inclusion_no: eventNumber
    })),
    hora_catedra: payload.experiencia_calificada.hora_catedra.map((item) => ({
      ...item,
      evento_no: eventNumber
    }))
  },
  productividad_academica: payload.productividad_academica.map((item) => ({
    ...item,
    inclusion_no: eventNumber
  })),
  premios_y_patentes: payload.premios_y_patentes.map((item) => ({
    ...item,
    evento_no: eventNumber
  })),
  docencia_destacada: payload.docencia_destacada.map((item) => ({
    ...item,
    evento_no: eventNumber
  })),
  extension_destacada: payload.extension_destacada.map((item) => ({
    ...item,
    evento_no: eventNumber
  }))
});

const validateEventReferences = (data) => {
  const eventNumbers = (data.eventos_credenciales || []).map(
    (event) => event.numero_evento
  );
  const uniqueEventNumbers = new Set(eventNumbers);

  if (uniqueEventNumbers.size !== eventNumbers.length) {
    const error = new Error(
      'No puede haber eventos credenciales con el mismo numero_evento'
    );
    error.statusCode = 400;
    throw error;
  }

  const references = [
    ...(data.titulos_universitarios?.pregrado || []).map((item) => item.evento_no),
    ...(data.titulos_universitarios?.posgrado || []).map((item) => item.evento_no),
    ...(data.historial_categoria || []).map((item) => item.inclusion_no),
    ...(data.experiencia_calificada?.tiempo_parcial || []).map((item) => item.inclusion_no),
    ...(data.experiencia_calificada?.hora_catedra || []).map((item) => item.evento_no),
    ...(data.productividad_academica || []).map((item) => item.inclusion_no),
    ...(data.premios_y_patentes || []).map((item) => item.evento_no),
    ...(data.docencia_destacada || []).map((item) => item.evento_no),
    ...(data.extension_destacada || []).map((item) => item.evento_no)
  ];
  const invalidReference = references.find(
    (reference) => !uniqueEventNumbers.has(reference)
  );

  if (invalidReference !== undefined) {
    const error = new Error(
      `El evento ${invalidReference} no existe en eventos_credenciales`
    );
    error.statusCode = 400;
    throw error;
  }
};

export const createCredencialesController = async (req, res) => {
  try {
    const payload = createCredenciales(req.body);
    validateEventReferences(payload);
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

export const getProximoEventoController = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const credencialesRef = doc(credencialesCollection, profesorId);
    const credencialesDoc = await getDoc(credencialesRef);

    if (!credencialesDoc.exists()) {
      return res.status(404).json({ message: 'Credenciales no encontradas' });
    }

    const data = credencialesDoc.data();
    const ultimoNumeroEvento = Math.max(
      getNextEventNumber(data) - 1,
      0
    );

    return res.status(200).json({
      ultimo_numero_evento: ultimoNumeroEvento,
      proximo_numero_evento: ultimoNumeroEvento + 1
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createEventoCredencialController = async (req, res) => {
  try {
    const { profesorId } = req.params;
    const payload = CrearEventoCredencialSchema.parse(req.body);
    const credencialesRef = doc(credencialesCollection, profesorId);

    await runTransaction(db, async (transaction) => {
      const credencialesDoc = await transaction.get(credencialesRef);

      if (!credencialesDoc.exists()) {
        const err = new Error('Credenciales no encontradas');
        err.statusCode = 404;
        throw err;
      }

      const currentData = credencialesDoc.data();
      const numeroEvento = getNextEventNumber(currentData);
      const factores = addEventNumberToFactors(payload, numeroEvento);
      const mergedData = {
        ...currentData,
        ultimo_numero_evento: numeroEvento,
        eventos_credenciales: [
          ...(currentData.eventos_credenciales || []),
          { ...payload.evento, numero_evento: numeroEvento }
        ],
        titulos_universitarios: {
          ...(currentData.titulos_universitarios || {}),
          pregrado: [
            ...(currentData.titulos_universitarios?.pregrado || []),
            ...factores.titulos_universitarios.pregrado
          ],
          posgrado: [
            ...(currentData.titulos_universitarios?.posgrado || []),
            ...factores.titulos_universitarios.posgrado
          ]
        },
        historial_categoria: [
          ...(currentData.historial_categoria || []),
          ...factores.historial_categoria
        ],
        experiencia_calificada: {
          ...(currentData.experiencia_calificada || {}),
          tiempo_parcial: [
            ...(currentData.experiencia_calificada?.tiempo_parcial || []),
            ...factores.experiencia_calificada.tiempo_parcial
          ],
          hora_catedra: [
            ...(currentData.experiencia_calificada?.hora_catedra || []),
            ...factores.experiencia_calificada.hora_catedra
          ]
        },
        productividad_academica: [
          ...(currentData.productividad_academica || []),
          ...factores.productividad_academica
        ],
        premios_y_patentes: [
          ...(currentData.premios_y_patentes || []),
          ...factores.premios_y_patentes
        ],
        docencia_destacada: [
          ...(currentData.docencia_destacada || []),
          ...factores.docencia_destacada
        ],
        extension_destacada: [
          ...(currentData.extension_destacada || []),
          ...factores.extension_destacada
        ]
      };

      transaction.update(credencialesRef, {
        ...PuntajeService.procesarCredenciales(mergedData),
        updatedAt: new Date().toISOString()
      });
    });

    const updatedDoc = await getDoc(credencialesRef);
    return res.status(201).json({
      numero_evento: updatedDoc.data().ultimo_numero_evento,
      credenciales: toResponse(updatedDoc)
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
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
    validateEventReferences(mergedData);
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
