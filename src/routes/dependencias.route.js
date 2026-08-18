import { Router } from 'express';
import {
  createDependenciaController,
  deleteDependenciaController,
  getDependenciaByIdController,
  getDependenciasController,
  updateDependenciaController
} from '../controllers/dependenciasController.js';

const router = Router();

router.post('/', createDependenciaController);
router.get('/', getDependenciasController);
router.get('/:id', getDependenciaByIdController);
router.put('/:id', updateDependenciaController);
router.delete('/:id', deleteDependenciaController);

export default router;
