import { z } from 'zod';
import { obtenerEstadisticas, reconstruirEstadisticas } from '../services/estadisticasService.js';

export const getEstadisticasController = async (_req, res) => {
  try {
    const allowed = ['periodo', 'escuela_id', 'tipo_vinculacion', 'dedicacion', 'cargo', 'nivel'];
    const filters = Object.fromEntries(allowed
      .filter(key => typeof _req.query[key] === 'string' && _req.query[key].trim())
      .map(key => [key, _req.query[key].trim()]));
    return res.status(200).json(await obtenerEstadisticas(filters));
  }
  catch (error) { return res.status(500).json({ message: 'Error interno del servidor', error: error.message }); }
};

export const rebuildEstadisticasController = async (req, res) => {
  try {
    const periodo = z.string().regex(/^\d{4}-[1-2]$/).parse(req.body?.periodo || '2026-2');
    return res.status(200).json(await reconstruirEstadisticas(periodo));
  } catch (error) { return res.status(400).json({ message: 'Periodo invalido', error: error.message }); }
};
