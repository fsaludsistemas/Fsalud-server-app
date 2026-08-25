import { z } from 'zod';

const permisosDirectivos = ['DIRECTOR ESCUELA', 'DIRECTOR OFICINA'];

const BaseUsuarioSchema = z.object({
  email: z.string().email('Debe ser un correo valido').transform((v) => v.toLowerCase().trim()),
  permiso: z.enum(['ADMINISTRADOR', 'LECTURA', 'SISTEMAS', 'EDITOR', 'DIRECTOR ESCUELA', 'DIRECTOR OFICINA']),
  // IDs de la ESCUELA u OFICINA a la que pertenece el usuario
  dependencia_actual: z.object({
    escuela_o_oficina_id: z.string({ required_error: 'ID de Escuela u Oficina es requerido' }),
    departamento_id: z.string().optional(),
    seccion_id: z.string().optional(),
    // IDs de dependencias superiores para búsquedas jerárquicas rápidas
    ancestros: z.array(z.string()).default([])
  }).optional(),
  
  estado: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO')
});

const UsuarioSchema = BaseUsuarioSchema.superRefine((data, ctx) => {
    const requiereDependencia = permisosDirectivos.includes(data.permiso);

    if (requiereDependencia && !data.dependencia_actual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dependencia_actual'],
        message: 'Este permiso requiere dependencia_actual'
      });
    }
  });


const UpdateUsuarioSchema = BaseUsuarioSchema.partial();

const createUsuario = (data) => {
  const validData = UsuarioSchema.parse(data);
  const now = new Date().toISOString();

  return {
    ...validData,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  };
};


export { UsuarioSchema, UpdateUsuarioSchema, createUsuario };