import { z } from 'zod';

const DependenciaSchema = z.object({
  nombre: z.string().min(3, 'El nombre de la dependencia es requerido'),
  tipo: z.enum(['ESCUELA', 'OFICINA', 'DEPARTAMENTO', 'SECCION']),
  padre_id: z.string().nullable().default(null), // null si es Escuela u Oficina
  ancestros: z.array(z.string()).default([]),    // Lista de IDs superiores
  estado: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO')
});

const UpdateDependenciaSchema = DependenciaSchema.partial();

const createDependencia = (data) => {
  const validData = DependenciaSchema.parse(data);
  return {
    ...validData,
    createdAt: new Date().toISOString()
  };
};

export { DependenciaSchema, UpdateDependenciaSchema, createDependencia };