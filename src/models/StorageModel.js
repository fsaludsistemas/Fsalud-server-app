import { z } from 'zod';

const StorageUploadTargetSchema = z.object({
  profesor_id: z.string().min(1, 'El ID del profesor es obligatorio'),
  nombre_archivo: z.string().min(1, 'El nombre del archivo es obligatorio'),
  content_type: z.string().min(1, 'El content_type es obligatorio'),
  tipo: z.enum([
    'FOTO_PROFESOR',
    'SOPORTE_CREDENCIAL',
    'ACTA_CCS',
    'FIRMA_PRESIDENTE'
  ]),
  factor: z.enum([
    'titulos_universitarios',
    'historial_categoria',
    'experiencia_calificada',
    'productividad_academica',
    'premios_y_patentes',
    'docencia_destacada',
    'extension_destacada',
    'eventos_credenciales'
  ]).optional(),
  referencia_id: z.string().optional()
});

export { StorageUploadTargetSchema };
