import { z } from 'zod';

const CounterSchema = z.record(z.number().int().nonnegative());

const EstadisticasDashboardSchema = z.object({
  periodo_profesores: z.string(),
  profesores: z.object({
    total: z.number().int().nonnegative(),
    por_escuela: CounterSchema,
    por_tipo_vinculacion: CounterSchema,
    por_dedicacion: CounterSchema,
    por_cargo: CounterSchema,
    por_nivel: CounterSchema
  }),
  factores: z.object({
    pregrado: z.number().int().nonnegative(),
    posgrado: z.number().int().nonnegative(),
    categoria: z.number().int().nonnegative(),
    tiempo_parcial: z.number().int().nonnegative(),
    hora_catedra: z.number().int().nonnegative(),
    productividad_academica: z.number().int().nonnegative(),
    premios: z.number().int().nonnegative(),
    patentes: z.number().int().nonnegative(),
    extension_destacada: z.number().int().nonnegative(),
    docencia_destacada: z.number().int().nonnegative()
  }),
  eventos: z.object({
    total: z.number().int().nonnegative(),
    por_anio: CounterSchema,
    por_clase: CounterSchema,
    por_anio_y_clase: z.record(CounterSchema)
  }),
  actualizado_en: z.string()
});

export { EstadisticasDashboardSchema };
