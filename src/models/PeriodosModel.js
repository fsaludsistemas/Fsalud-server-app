import { z } from 'zod';

const PeriodosSchema = z.object({
  periodo: z.string().regex(/^\d{4}-[1-2]$/, 'El periodo debe tener el formato YYYY-1 o YYYY-2')
});

const UpdatePeriodosSchema = PeriodosSchema.partial();

const createPeriodos = (data) => {
  const validData = PeriodosSchema.parse(data);
  return {
    id: validData.periodo,
    data: {
      ...validData,
      createdAt: new Date().toISOString()
    }
  };
};

export { PeriodosSchema, UpdatePeriodosSchema, createPeriodos };
