import { z } from 'zod';
import { storageBucket } from '../config/firebase.js';
import { StorageUploadTargetSchema } from '../models/StorageModel.js';

const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0';

const handleError = (res, error) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Error de validacion',
      errors: error.issues
    });
  }

  return res.status(500).json({
    message: 'Error interno del servidor',
    error: error.message
  });
};

const sanitizePathSegment = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 120);

const extensionFromFileName = (fileName) => {
  const cleanName = sanitizePathSegment(fileName);
  const dotIndex = cleanName.lastIndexOf('.');
  return dotIndex > -1 ? cleanName.slice(dotIndex).toLowerCase() : '';
};

const buildStoragePath = (payload) => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).slice(2, 10);
  const profesorId = sanitizePathSegment(payload.profesor_id);
  const reference = sanitizePathSegment(payload.referencia_id || 'general');
  const extension = extensionFromFileName(payload.nombre_archivo);
  const fileName = `${timestamp}_${random}${extension}`;

  if (payload.tipo === 'FOTO_PROFESOR') {
    return `profesores/${profesorId}/foto/${fileName}`;
  }

  const folderByType = {
    SOPORTE_CREDENCIAL: `credenciales/${profesorId}/soportes/${sanitizePathSegment(payload.factor || 'general')}/${reference}`,
    ACTA_CCS: `credenciales/${profesorId}/eventos/${reference}/actas`,
    FIRMA_PRESIDENTE: `credenciales/${profesorId}/eventos/${reference}/firmas`
  };

  return `${folderByType[payload.tipo]}/${fileName}`;
};

const buildDownloadUrl = (path) => {
  const encodedPath = encodeURIComponent(path);
  return `${FIREBASE_STORAGE_BASE_URL}/b/${storageBucket}/o/${encodedPath}?alt=media`;
};

const validateStoragePath = (path) => {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..')) {
    const error = new Error('La ruta del archivo no es valida');
    error.statusCode = 400;
    throw error;
  }
};

export const getStorageFileController = async (req, res) => {
  try {
    const { path } = req.query;
    validateStoragePath(path);

    const response = await fetch(buildDownloadUrl(path), {
      headers: {
        Authorization: `Bearer ${req.firebaseIdToken}`
      }
    });

    if (!response.ok) {
      const error = new Error(
        response.status === 404
          ? 'Archivo no encontrado'
          : 'No se pudo obtener el archivo'
      );
      error.statusCode = response.status === 404 ? 404 : 502;
      throw error;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const fileBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    return res.status(200).send(fileBuffer);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return handleError(res, error);
  }
};

export const createStorageUploadTargetController = async (req, res) => {
  try {
    const payload = StorageUploadTargetSchema.parse(req.body);
    if (payload.tipo === 'FIRMA_PRESIDENTE' && req.usuario.permiso !== 'PRESIDENTE') {
      return res.status(403).json({ message: 'Solo un PRESIDENTE puede cargar una firma' });
    }
    const path = buildStoragePath(payload);
    const encodedPath = encodeURIComponent(path);
    const uploadUrl = `${FIREBASE_STORAGE_BASE_URL}/b/${storageBucket}/o?uploadType=media&name=${encodedPath}`;
    const downloadUrl = buildDownloadUrl(path);

    return res.status(200).json({
      bucket: storageBucket,
      path,
      uploadUrl,
      downloadUrl,
      method: 'POST',
      headers: {
        Authorization: 'Bearer <idToken>',
        'Content-Type': payload.content_type
      },
      guardar_en: payload.tipo === 'FOTO_PROFESOR' ? 'profesores.foto_url' : 'campo url_* correspondiente'
    });
  } catch (error) {
    return handleError(res, error);
  }
};
