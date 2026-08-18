import { z } from 'zod';

const ProfesorSchema = z.object({
  tipo_identificacion: z.enum(['CEDULA', 'PASAPORTE', 'TARJETA_IDENTIDAD']),  
  numero_identificacion: z.string().min(5, 'La cédula/documento es obligatoria'),
  nombres: z.string().min(2, 'Los nombres son requeridos'),
  apellidos: z.string().min(2, 'Los apellidos son requeridos'),
  lugar_nacimiento: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  email_institucional: z.string().email('Debe ser un correo válido'),
  telefono: z.string().optional(),
  fecha_vinculacion: z.string().optional(),
  foto_url: z.string().optional(),
  // Objeto embobado con la adscripción a la Facultad
  dependencia_actual: z.object({
    escuela_o_oficina_id: z.string({ required_error: 'ID de Escuela u Oficina es requerido' }),
    escuela_o_oficina: z.string(),
    departamento_id: z.string().optional(),
    departamento: z.string().optional(),
    seccion_id: z.string().optional(),
    seccion: z.string().optional(),
    // Arreglo de IDs ancestros para búsquedas jerárquicas rápidas
    ancestros: z.array(z.string()).default([])
  }),
  
  estado: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO')
});

const UpdateProfesorSchema = ProfesorSchema.partial();

const createProfesor = (data) => {
  const validData = ProfesorSchema.parse(data);
  return {
    ...validData,
    updatedAt: new Date().toISOString()
  };
};

export { ProfesorSchema, UpdateProfesorSchema, createProfesor };