import { z } from 'zod';

const DocentePeriodoSchema = z.object({
  profesor_id: z.string(),
  periodo_id: z.string(),
  tipo_vinculacion: z.enum(['NOMBRADO', 'CONTRATISTA', 'AD-HONOREM', 'ASISTENTE DOC']),
  dedicacion: z.enum(['COMPLETO', 'PARCIAL', 'H. CATEDRA']),
  categoria_docente: z.enum(['AUXILIAR', 'ASISTENTE', 'ASOCIADO', 'TITULAR', 'SIN CARGO']),
  estado: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO'),
  nivel: z.enum(['PREGRADO', 'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION']).optional()
});

const UpdateDocentePeriodoSchema = DocentePeriodoSchema.partial();

const createDocentePeriodo = (data) => {
  const validData = DocentePeriodoSchema.parse(data);
  const customId = `${validData.profesor_id}_${validData.periodo_id}`;
  return {
    id: customId,
    data: {
      ...validData,
      createdAt: new Date().toISOString()
    }
  };
};

export { DocentePeriodoSchema, UpdateDocentePeriodoSchema, createDocentePeriodo };
