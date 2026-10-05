import { z } from 'zod';

const DocentePeriodoSchema = z.object({
  profesor_id: z.string(),
  periodo_id: z.string(),
  tipo_vinculacion: z.enum(['NOMBRADO', 'CONTRATISTA', 'AD-HONOREM', 'ASISTENTE DOC']),
  dedicacion: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.enum(['COMPLETO', 'PARCIAL', 'H. CATEDRA', 'H. CATERA', 'HORA CATEDRA']).optional()
  ),
  cargo: z.enum(['AUXILIAR', 'ASISTENTE', 'ASOCIADO', 'TITULAR', 'SIN CARGO']),
  estado: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO'),
  nivel: z.enum(['PREGRADO', 'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION', 'ESPECIALISTA', 'ESPECIALIZACIÓN']),
});

const UpdateDocentePeriodoSchema = DocentePeriodoSchema.partial();

const createDocentePeriodo = (data) => {
  const validData = DocentePeriodoSchema.parse(data);
  const dataWithoutUndefined = Object.fromEntries(
    Object.entries(validData).filter(([, value]) => value !== undefined)
  );
  const customId = `${validData.profesor_id}_${validData.periodo_id}`;
  return {
    id: customId,
    data: {
      ...dataWithoutUndefined,
      createdAt: new Date().toISOString()
    }
  };
};

export { DocentePeriodoSchema, UpdateDocentePeriodoSchema, createDocentePeriodo };
