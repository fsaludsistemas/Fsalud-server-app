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
import { createProfesor, UpdateProfesorSchema } from '../models/ProfesorModel.js';

const profesoresCollection = collection(db, 'profesores');
const dependenciasCollection = collection(db, 'dependencias');
const docentePeriodosCollection = collection(db, 'docente_periodos');
const periodosCollection = collection(db, 'periodos');
const credencialesCollection = collection(db, 'credenciales');

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

const enrichDocentePeriodo = async (docSnap) => {
	const data = docSnap.data();
	const periodoRef = doc(periodosCollection, data.periodo_id);
	const periodoDoc = await getDoc(periodoRef);

	return {
		id: docSnap.id,
		...data,
		periodo: periodoDoc.exists() ? { id: periodoDoc.id, ...periodoDoc.data() } : null
	};
};

const enrichProfesor = async (profesorDoc) => {
	const docentePeriodoQuery = query(
		docentePeriodosCollection,
		where('profesor_id', '==', profesorDoc.id)
	);
	const docentePeriodoResult = await getDocs(docentePeriodoQuery);
	const docentePeriodos = await Promise.all(
		docentePeriodoResult.docs.map((item) => enrichDocentePeriodo(item))
	);

	return {
		id: profesorDoc.id,
		...profesorDoc.data(),
		docente_periodos: docentePeriodos
	};
};

export const createProfesorController = async (req, res) => {
	try {
		const payload = createProfesor(req.body);
		await validateDependenciaActual(payload.dependencia_actual);

		const duplicatedQuery = query(
			profesoresCollection,
			where('numero_identificacion', '==', payload.numero_identificacion)
		);
		const duplicatedResult = await getDocs(duplicatedQuery);

		if (!duplicatedResult.empty) {
			return res.status(409).json({
				message: 'Ya existe un profesor con ese numero de identificacion'
			});
		}

		const createdRef = await addDoc(profesoresCollection, payload);
		const createdDoc = await getDoc(createdRef);

		return res.status(201).json({ id: createdRef.id, ...createdDoc.data() });
	} catch (error) {
		if (error.statusCode) {
			return res.status(error.statusCode).json({ message: error.message });
		}
		return handleError(res, error);
	}
};

export const getProfesoresController = async (_req, res) => {
	try {
		const snapshot = await getDocs(profesoresCollection);
		const profesores = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
		return res.status(200).json(profesores);
	} catch (error) {
		return handleError(res, error);
	}
};

export const getProfesorByIdController = async (req, res) => {
	try {
		const { id } = req.params;
		const profesorRef = doc(profesoresCollection, id);
		const profesorDoc = await getDoc(profesorRef);

	if (!profesorDoc.exists()) {
		return res.status(404).json({ message: 'Profesor no encontrado' });
	}

	return res.status(200).json(await enrichProfesor(profesorDoc));
	} catch (error) {
		return handleError(res, error);
	}
};

export const updateProfesorController = async (req, res) => {
	try {
		const { id } = req.params;
		const profesorRef = doc(profesoresCollection, id);
		const profesorDoc = await getDoc(profesorRef);

		if (!profesorDoc.exists()) {
			return res.status(404).json({ message: 'Profesor no encontrado' });
		}

		const updatePayload = UpdateProfesorSchema.parse(req.body);
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

		await updateDoc(profesorRef, dataWithAudit);
		const updatedDoc = await getDoc(profesorRef);

		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error) {
		if (error.statusCode) {
			return res.status(error.statusCode).json({ message: error.message });
		}
		return handleError(res, error);
	}
};

export const deleteProfesorController = async (req, res) => {
	try {
		const { id } = req.params;
		const profesorRef = doc(profesoresCollection, id);
		const profesorDoc = await getDoc(profesorRef);

		if (!profesorDoc.exists()) {
			return res.status(404).json({ message: 'Profesor no encontrado' });
		}

		const docentePeriodoQuery = query(docentePeriodosCollection, where('profesor_id', '==', id));
		const docentePeriodoResult = await getDocs(docentePeriodoQuery);

		if (!docentePeriodoResult.empty) {
			return res.status(409).json({
				message: 'No se puede eliminar: el profesor tiene periodos docentes asociados'
			});
		}

		const credencialesRef = doc(credencialesCollection, id);
		const credencialesDoc = await getDoc(credencialesRef);

		if (credencialesDoc.exists()) {
			return res.status(409).json({
				message: 'No se puede eliminar: el profesor tiene credenciales asociadas'
			});
		}

		await deleteDoc(profesorRef);
		return res.status(200).json({ message: 'Profesor eliminado correctamente' });
	} catch (error) {
		return handleError(res, error);
	}
};
