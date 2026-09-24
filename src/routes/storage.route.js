import { Router } from 'express';
import {
  createStorageUploadTargetController,
  getStorageFileController
} from '../controllers/storageController.js';

const router = Router();

router.post('/upload-target', createStorageUploadTargetController);
router.get('/file', getStorageFileController);

export default router;
