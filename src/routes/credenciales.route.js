import { Router } from 'express';
import {
  createCredencialesController,
  createEventoCredencialController,
  addFirmaPresidenteController,
  deleteCredencialesController,
  getCredencialesByProfesorController,
  getCredencialesController,
  getProximoEventoController,
  updateCredencialesController
} from '../controllers/credencialesController.js';

const router = Router();

router.post('/', createCredencialesController);
router.get('/', getCredencialesController);
router.get('/:profesorId/proximo-evento', getProximoEventoController);
router.post('/:profesorId/eventos', createEventoCredencialController);
router.patch('/:profesorId/eventos/:numeroEvento/firma', addFirmaPresidenteController);
router.get('/:profesorId', getCredencialesByProfesorController);
router.patch('/:profesorId', updateCredencialesController);
router.put('/:profesorId', updateCredencialesController);
router.delete('/:profesorId', deleteCredencialesController);

export default router;
