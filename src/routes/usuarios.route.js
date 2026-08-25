import { Router } from 'express';
import {
  createUsuarioController,
  deleteUsuarioController,
  getUsuarioByIdController,
  getUsuariosController,
  updateUsuarioController
} from '../controllers/usuariosController.js';

const router = Router();

router.post('/', createUsuarioController);
router.get('/', getUsuariosController);
router.get('/:id', getUsuarioByIdController);
router.put('/:id', updateUsuarioController);
router.delete('/:id', deleteUsuarioController);

export default router;
