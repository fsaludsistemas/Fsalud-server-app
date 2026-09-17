import { Router } from 'express';
import {
  createAsignacionesController,
  deleteAsignacionesController,
  getAsignacionesByIdController,
  getAsignacionesByProfesorController,
  getAsignacionesController,
  getResumenHorasController,
  updateAsignacionesController
} from '../controllers/asignacionesController.js';

const router = Router();

router.post('/', createAsignacionesController);
router.get('/', getAsignacionesController);
router.get('/profesor/:profesorId', getAsignacionesByProfesorController);
router.get('/resumen-horas', getResumenHorasController);
router.get('/:id', getAsignacionesByIdController);
router.put('/:id', updateAsignacionesController);
router.delete('/:id', deleteAsignacionesController);

export default router;
