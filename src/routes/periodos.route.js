import { Router } from 'express';
import {
  createPeriodosController,
  deletePeriodoController,
  getPeriodoByIdController,
  getPeriodosController,
  updatePeriodoController
} from '../controllers/periodosController.js';

const router = Router();

router.post('/', createPeriodosController);
router.get('/', getPeriodosController);
router.get('/:id', getPeriodoByIdController);
router.put('/:id', updatePeriodoController);
router.delete('/:id', deletePeriodoController);

export default router;
