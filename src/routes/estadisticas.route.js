import { Router } from 'express';
import { getEstadisticasController, rebuildEstadisticasController } from '../controllers/estadisticasController.js';

const router = Router();
router.get('/dashboard', getEstadisticasController);
router.post('/dashboard/reconstruir', rebuildEstadisticasController);
export default router;
