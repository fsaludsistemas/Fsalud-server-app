import { z } from 'zod';

const FactorEventoPuntajeSchema = z.object({
  evento: z.number(),
  tot_acum: z.number()
});

const FactoresPuntajeSchema = z.object({
  titulos_universitarios: FactorEventoPuntajeSchema,
  categoria: FactorEventoPuntajeSchema,
  experiencia_calificada: FactorEventoPuntajeSchema,
  productividad_academica: FactorEventoPuntajeSchema
});

const SoporteEventoSchema = z.object({
  acta_ccs: z.string(),
  fecha: z.string(),
  firma_presidente_url: z.string().optional()
});

const EventoCredencialesSchema = z.object({
  numero_evento: z.number().int().positive(),
  clase: z.enum(['1', '2', '3']).or(z.string()),
  dedicacion: z.string(),
  factores_puntaje: FactoresPuntajeSchema,
  puntos_del_evento: z.number(),
  total_puntos_acumulado: z.number(),
  soporte: SoporteEventoSchema,
  observaciones: z.string().optional()
});

const ResumenPuntosSchema = z.object({
  titulos_universitarios: z.number(),
  categoria: z.number(),
  experiencia_calificada: z.number(),
  productividad_academica: z.number(),
  puntos_totales: z.number(),
  ultimo_evento_numero: z.number().int().nonnegative(),
  fecha_ultima_actualizacion: z.string()
});

const TituloPregradoSchema = z.object({
  id: z.string(),
  evento_no: z.number().int().positive(),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  titulo: z.string(),
  institucion_lugar: z.string(),
  fecha_grado: z.string(),
  puntos: z.number(),
  acumulado: z.number()
});

const TituloPosgradoSchema = z.object({
  id: z.string(),
  evento_no: z.number().int().positive(),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  titulo: z.string(),
  institucion_lugar: z.string(),
  fecha_grado: z.string(),
  puntos: z.number(),
  acumulado: z.number()
});

const TitulosUniversitariosSchema = z.object({
  pregrado: z.array(TituloPregradoSchema).default([]),
  posgrado: z.array(TituloPosgradoSchema).default([])
});

const HistorialCategoriaSchema = z.object({
  inclusion_no: z.string(),
  fecha: z.string(),
  categoria: z.enum(['A', 'B', 'C', 'D']),
  puntos: z.number()
});

const ExperienciaTiempoParcialSchema = z.object({
  id: z.string(),
  inclusion_no: z.number().int().positive(),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  cargo: z.string(),
  codigo_dedicacion: z.enum(['1', '2']),
  institucion_lugar: z.string(),
  anios_o_meses: z.string(),
  puntos_anio: z.number().optional(),
  puntos: z.number().optional(),
  total_acumulado: z.number().optional(),
  total_con_tope: z.number().optional()
});

const ExperienciaHoraCatedraSchema = z.object({
  id: z.string(),
  evento_no: z.number().int().positive(),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  cargo: z.string(),
  institucion_lugar: z.string(),
  puntos_h_s_s: z.number().optional(),
  total_h_s_s_periodo: z.number().optional(),
  puntos: z.number().optional(),
  total_acumulado: z.number().optional(),
  total_con_tope: z.number().optional()
});

const ExperienciaCalificadaSchema = z.object({
  tiempo_parcial: z.array(ExperienciaTiempoParcialSchema).default([]),
  hora_catedra: z.array(ExperienciaHoraCatedraSchema).default([])
});

const ProductividadAcademicaSchema = z.object({
  id: z.string(),
  inclusion_no: z.number().int().positive(),
  trabajo_no: z.number().int().positive(),
  titulo: z.string(),
  publicacion_detalle: z.string(),
  clase: z.string().optional(),
  tipo_texto: z.enum(['L', 'AL', 'Ar', 'T']).optional(),
  articulo_revista: z.string().optional(),
  libro: z.number().optional(),
  puntaje_acumulado: z.number().optional()
});

const PremioPatenteSchema = z.object({
  id: z.string(),
  evento_no: z.number().int().positive(),
  premio_no: z.number().int().positive(),
  descripcion: z.string(),
  fecha: z.string(),
  puntaje_parcial: z.number(),
  puntaje_acumulado: z.number()
});

const DocenciaDestacadaSchema = z.object({
  id: z.string(),
  evento_no: z.number().int().positive(),
  semestre: z.number().int().min(1).max(2),
  anio: z.number().int(),
  asignatura: z.string(),
  fecha_solicitud: z.string(),
  puntos_evento: z.number(),
  acumulado_puntos: z.number()
});

const ExtensionDestacadaSchema = z.object({
  id: z.string(),
  evento_no: z.number().int().positive(),
  semestre: z.number().int().min(1).max(2).optional(),
  anio: z.number().int().optional(),
  actividad: z.string(),
  fecha_solicitud: z.string().optional(),
  puntos_evento: z.number(),
  acumulado_puntos: z.number()
});

const CredencialesSchema = z.object({
  profesor_id: z.string().min(1, 'El ID del profesor es obligatorio'),
  resumen_puntos: ResumenPuntosSchema.optional(),
  eventos_credenciales: z.array(EventoCredencialesSchema).default([]),
  titulos_universitarios: TitulosUniversitariosSchema.default({ pregrado: [], posgrado: [] }),
  historial_categoria: z.array(HistorialCategoriaSchema).default([]),
  experiencia_calificada: ExperienciaCalificadaSchema.default({
    tiempo_parcial: [],
    hora_catedra: []
  }),
  productividad_academica: z.array(ProductividadAcademicaSchema).default([]),
  premios_y_patentes: z.array(PremioPatenteSchema).default([]),
  docencia_destacada: z.array(DocenciaDestacadaSchema).default([]),
  extension_destacada: z.array(ExtensionDestacadaSchema).default([])
});

const UpdateCredencialesSchema = CredencialesSchema.partial();

const createCredenciales = (data) => {
  const validData = CredencialesSchema.parse(data);
  const now = new Date().toISOString();
  return {
    ...validData,
    updatedAt: now
  };
};

export {
  CredencialesSchema,
  UpdateCredencialesSchema,
  createCredenciales,
  EventoCredencialesSchema,
  TituloPregradoSchema,
  TituloPosgradoSchema,
  HistorialCategoriaSchema,
  ExperienciaTiempoParcialSchema,
  ExperienciaHoraCatedraSchema,
  ProductividadAcademicaSchema,
  PremioPatenteSchema,
  DocenciaDestacadaSchema,
  ExtensionDestacadaSchema
};
