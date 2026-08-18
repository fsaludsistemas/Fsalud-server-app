import { Router } from 'express';
import {
  createDocentePeriodoController,
  deleteDocentePeriodoController,
  getDocentePeriodoByIdController,
  getDocentePeriodosController,
  updateDocentePeriodoController
} from '../controllers/docentePeriodosController.js';

const router = Router();

router.post('/', createDocentePeriodoController);
router.get('/', getDocentePeriodosController);
router.get('/:id', getDocentePeriodoByIdController);
router.put('/:id', updateDocentePeriodoController);
router.delete('/:id', deleteDocentePeriodoController);

export default router;
