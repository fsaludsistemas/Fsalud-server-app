import { Router } from 'express';
import {
  createUsuarioController,
  deleteUsuarioController,
  getUsuarioByIdController,
  getUsuariosController,
  updateUsuarioController
} from '../controllers/usuariosController.js';
import { requireRoles } from '../Middlewares/requireRoles.js';

const router = Router();

router.use(requireRoles('ADMINISTRADOR', 'SISTEMAS'));

router.post('/', createUsuarioController);
router.get('/', getUsuariosController);
router.get('/:id', getUsuarioByIdController);
router.put('/:id', updateUsuarioController);
router.delete('/:id', deleteUsuarioController);

export default router;
