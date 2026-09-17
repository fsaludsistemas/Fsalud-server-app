import { Router } from 'express';
import {
	createProfesorController,
	deleteProfesorController,
	getProfesorByIdController,
	getProfesoresController,
	searchProfesoresController,
	updateProfesorController
} from '../controllers/profesoresController.js';

const router = Router();

router.post('/', createProfesorController);
router.get('/', getProfesoresController);
router.get('/buscar', searchProfesoresController);
router.get('/:id', getProfesorByIdController);
router.put('/:id', updateProfesorController);
router.delete('/:id', deleteProfesorController);

export default router;
