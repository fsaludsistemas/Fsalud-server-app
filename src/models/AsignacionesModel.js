import { z } from 'zod';

const AsignacionesDocenteSchema = z.object({
  profesor_id: z.string(),
  docente_periodo_id: z.string(),
  tipo_actividad: z.enum([
    'Administrativas',
    'Comisión',
    'Complementarias',
    'Docencia',
    'Investigación',
    'Extensión',
    'Intelectual',
    'Sin actividades'
  ]),
  actividad: z.enum([
    'ACTIVIDADES ADMINISTRATIVAS',
    'ACTIVIDADES COMPLEMENTARIAS',
    'ACTIVIDADES DE DOCENCIA',
    'ACTIVIDADES DE EXTENSIÓN',
    'ACTIVIDADES DE INVESTIGACIÓN',
    'ACTIVIDADES INTELECTUALES O ARTISTICAS',
    'DOCENTE EN COMISIÓN',
    'SIN ACTIVIDADES'
  ]),
  nombre_actividad: z.string().optional(),
  detalle_actividad: z.string().optional(),
  numero_horas: z.number().optional(),
  categoria: z.string().optional(),
});

const UpdateAsignacionesDocenteSchema = AsignacionesDocenteSchema.partial();

const createAsignacionesDocente = (data) => {
  const validData = AsignacionesDocenteSchema.parse(data);
  return {
    data: {
      ...validData,
      createdAt: new Date().toISOString()
    }
  };
};

export { AsignacionesDocenteSchema, UpdateAsignacionesDocenteSchema, createAsignacionesDocente };
