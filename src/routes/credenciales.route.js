import { Router } from 'express';
import {
  createCredencialesController,
  deleteCredencialesController,
  getCredencialesByProfesorController,
  getCredencialesController,
  updateCredencialesController
} from '../controllers/credencialesController.js';

const router = Router();

router.post('/', createCredencialesController);
router.get('/', getCredencialesController);
router.get('/:profesorId', getCredencialesByProfesorController);
router.patch('/:profesorId', updateCredencialesController);
router.put('/:profesorId', updateCredencialesController);
router.delete('/:profesorId', deleteCredencialesController);

export default router;
