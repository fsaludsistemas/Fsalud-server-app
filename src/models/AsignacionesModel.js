import { z } from 'zod';

const AsignacionesDocenteSchema = z.object({
  profesor_id: z.string(),
  docente_periodo_id: z.string(),
  tipo_actividad: z.enum(['Administrativas', 'Comisión', 'Complementarias', 'Docencia', 'Investigación', 'Extensión', 'Intelectual', 'Sin actividades']),
  actividad: z.enum(['ACTIVIDADES ADMINISTRATIVAS', 'ACTIVIDADES COMPLEMETARIAS', 'ACTIVIDADES DE DOCENCIA', 'ACTIVIDADES DE EXTENSIÓN', 'ACTIVIDADES DE INVESTIGACIÓN', 'ACTIVIDADES INTELECTUALES O ARTISTICAS', 'DOCENTE EN COMISIÓN']),
  categoria: z.enum(['COMPLETO', 'PARCIAL', 'H. CATEDRA']),
  nombre_actividad: z.enum(['AUXILIAR', 'ASISTENTE', 'ASOCIADO', 'TITULAR', 'SIN CARGO']),
  detalle_actividad: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO'),
  numero_horas: z.integer().optional(),
  nivel: z.enum(['PREGRADO', 'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION']).optional(),
  cargo: z.string().optional(),
});

const UpdateAsignacionesDocenteSchema = AsignacionesDocenteSchema.partial();

const createAsignacionesDocente = (data) => {
  const validData = AsignacionesDocenteSchema.parse(data);
  const customId = `${validData.profesor_id}_${validData.periodo_id}`;
  return {
    id: customId,
    data: {
      ...validData,
      createdAt: new Date().toISOString()
    }
  };
};

export { AsignacionesDocenteSchema, UpdateAsignacionesDocenteSchema, createAsignacionesDocente };
