class PuntajeService {
  /**
   * Obtiene la categoría actual basada en el historial
   */
  static getCategoriaActual(historialCategoria) {
    if (!historialCategoria || historialCategoria.length === 0) return 'A'; // Por defecto Auxiliar
    const ultimaCategoria = historialCategoria[historialCategoria.length - 1];
    return ultimaCategoria.categoria; // 'A', 'B', 'C', 'D'
  }

  /**
   * 1.1. PREGRADO
   * - Medicina o composición musical: 183 ptos.
   * - Demás profesionales: 178 ptos.
   */
  static calcularPregrado(pregrados = []) {
    let acumulado = 0;
    const registros = pregrados.map((p) => {
      const puntos = p.tipo_pregrado === 'MEDICINA_O_MUSICA' ? 183 : 178;
      acumulado += puntos;
      return { ...p, puntos, acumulado };
    });
    return { registros, acumulado };
  }

  /**
   * 1.2 POSTGRADO (máximo acumulable 140 ptos)
   */
  static calcularPosgrado(posgrados = []) {
    let acumulado = 0;
    let especializacionesCount = 0;
    let maestriasCount = 0;
    let doctoradosCount = 0;
    let puntosEspecializacionYMaestria = 0;

    const registros = posgrados.map((p) => {
      let puntos = 0;

      // Calcular años si se necesita
      const fechaInicio = new Date(p.fecha_inicio);
      const fechaFin = new Date(p.fecha_fin);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);

      if (p.tipo_posgrado === 'ESPECIALIZACION') {
        if (especializacionesCount < 2) {
          if (especializacionesCount === 0) {
            puntos = 20;
            if (diffYears > 2) puntos += 10; // Año adicional
          } else {
            puntos = 10; // Segunda especialización
          }
          especializacionesCount++;
        }
      } else if (p.tipo_posgrado === 'ESPECIALIZACION_CLINICA') {
        // 15 puntos por año hasta 75
        puntos = Math.min(Math.floor(diffYears) * 15, 75);
      } else if (p.tipo_posgrado === 'MAESTRIA') {
        puntos = maestriasCount === 0 ? 40 : 20;
        maestriasCount++;
      } else if (p.tipo_posgrado === 'DOCTORADO') {
        puntos = doctoradosCount === 0 ? 80 : 40;
        doctoradosCount++;
      }

      // Restricción: Maestría + Especializaciones máximo 60 puntos
      if (['ESPECIALIZACION', 'MAESTRIA'].includes(p.tipo_posgrado)) {
        if (puntosEspecializacionYMaestria + puntos > 60) {
          puntos = Math.max(0, 60 - puntosEspecializacionYMaestria);
        }
        puntosEspecializacionYMaestria += puntos;
      }

      acumulado += puntos;
      if (acumulado > 140) acumulado = 140; // Tope general de 140 puntos

      return { ...p, puntos, acumulado };
    });

    return { registros, acumulado };
  }

  /**
   * CATEGORIAS
   */
  static calcularHistorialCategoria(historial = []) {
    const mapaPuntos = {
      'A': 37, // Prof. Auxiliar
      'B': 58, // Prof. Asistente
      'C': 74, // Prof. Asociado
      'D': 96  // Prof. Titular
    };

    const registros = historial.map((h) => {
      const puntos = mapaPuntos[h.categoria] || 0;
      return { ...h, puntos };
    });

    const total = registros.length > 0 ? registros[registros.length - 1].puntos : 0;
    return { registros, total };
  }

  /**
   * Obtiene el tope máximo de experiencia y hora cátedra basado en la categoría
   */
  static getTopeExperiencia(categoria) {
    const topes = {
      'A': 20,
      'B': 45,
      'C': 90,
      'D': 120
    };
    return topes[categoria] || 20;
  }

  static calcularAniosOMeses(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return '';

    const diferenciaDias = Math.abs(fin - inicio) / (1000 * 60 * 60 * 24);
    const meses = Math.round(diferenciaDias / (365 / 12));

    if (meses < 12) return `${meses}M`;

    const anios = Number((meses / 12).toFixed(1));
    return String(anios);
  }

  /**
   * EXPERIENCIA TIEMPO PARCIAL
   */
  static calcularExperiencia(experiencia = [], categoria) {
    const tope = this.getTopeExperiencia(categoria);
    let acumulado = 0;

    const registros = experiencia.map((e) => {
      const fechaInicio = new Date(e.fecha_inicio);
      const fechaFin = new Date(e.fecha_fin);
      const diffYears = Math.abs(fechaFin - fechaInicio) / (1000 * 60 * 60 * 24 * 365);

      let factorAnual = 0;
      if (e.tipo_experiencia === 'INVESTIGACION') factorAnual = 6;
      else if (e.tipo_experiencia === 'DOCENCIA') factorAnual = 4;
      else if (e.tipo_experiencia === 'DIRECCION') factorAnual = 4;
      else if (e.tipo_experiencia === 'OTRA_PROFESIONAL') factorAnual = 3;

      const puntos = factorAnual * diffYears;
      acumulado += puntos;
      const total_con_tope = Math.min(acumulado, tope);

      return { 
        ...e, 
        anios_o_meses: this.calcularAniosOMeses(e.fecha_inicio, e.fecha_fin),
        puntos_anio: factorAnual, 
        puntos: Number(puntos.toFixed(2)), 
        total_acumulado: Number(acumulado.toFixed(2)), 
        total_con_tope: Number(total_con_tope.toFixed(2)) 
      };
    });

    return { registros, acumulado: Math.min(acumulado, tope) };
  }

  /**
   * HORA CATEDRA
   */
  static calcularHoraCatedra(horaCatedra = [], categoria) {
    const tope = this.getTopeExperiencia(categoria);
    let acumulado = 0;

    const registros = horaCatedra.map((h) => {
      // Por regla, se otorgan puntos por hora/semana/semestre, pero la fórmula exacta no detalla el factor.
      // Asumiendo un campo puntos_h_s_s calculado de antemano o un valor base (p. ej., se pasa el dato total de horas)
      const puntos = h.total_h_s_s_periodo ? h.total_h_s_s_periodo * (h.puntos_h_s_s || 1) : 0;
      acumulado += puntos;
      const total_con_tope = Math.min(acumulado, tope);

      return {
        ...h,
        puntos: Number(puntos.toFixed(2)),
        total_acumulado: Number(acumulado.toFixed(2)),
        total_con_tope: Number(total_con_tope.toFixed(2))
      };
    });

    return { registros, acumulado: Math.min(acumulado, tope) };
  }

  /**
   * PRODUCTIVIDAD ACADEMICA
   */
  static calcularProductividad(productividad = []) {
    let acumulado = 0;
    const registros = productividad.map((p) => {
      let puntosBase = 0;
      if (p.tipo_texto === 'L') puntosBase = 20; // Libro investigación
      else if (p.tipo_texto === 'AL') puntosBase = 15; // Libro texto
      else if (p.tipo_texto === 'T') puntosBase = 15; // Traducción
      else if (p.tipo_texto === 'Ar') puntosBase = 15; // Asumiendo ensayo o articulo por defecto

      // Usar número de autores proporcionado o por defecto 1
      const numAutores = p.numero_autores || 1;

      let puntos = puntosBase;
      if (numAutores >= 4 && numAutores <= 5) puntos = puntosBase / 2;
      else if (numAutores >= 6) puntos = puntosBase / (numAutores / 2);

      acumulado += puntos;
      return { ...p, puntaje_acumulado: Number(acumulado.toFixed(2)) };
    });

    return { registros, acumulado };
  }

  /**
   * PREMIOS Y PATENTES
   */
  static calcularPremiosPatentes(premios = []) {
    let acumulado = 0;
    const registros = premios.map((p) => {
      const esPatente = p.tipo === 'PATENTE';
      const tope = esPatente ? 25 : 15;
      
      const puntos = Math.min(p.puntaje_parcial || tope, tope);
      acumulado += puntos;
      
      return { ...p, puntaje_parcial: puntos, puntaje_acumulado: acumulado };
    });
    return { registros, acumulado };
  }

  /**
   * DOCENCIA Y EXTENSION DESTACADAS
   */
  static calcularDocenciaExtension(eventos = [], categoria) {
    const mapaPuntos = {
      'A': 2,
      'B': 3,
      'C': 4,
      'D': 5
    };
    const puntosBase = mapaPuntos[categoria] || 2;
    let acumulado = 0;

    const registros = eventos.map((e) => {
      acumulado += puntosBase;
      return { ...e, puntos_evento: puntosBase, acumulado_puntos: acumulado };
    });

    return { registros, acumulado };
  }

  /**
   * PROCESAMIENTO COMPLETO DE CREDENCIALES
   */
  static procesarCredenciales(credencialesOriginales) {
    const credenciales = JSON.parse(JSON.stringify(credencialesOriginales));

    const pregradoCalc = this.calcularPregrado(credenciales.titulos_universitarios?.pregrado || []);
    const posgradoCalc = this.calcularPosgrado(credenciales.titulos_universitarios?.posgrado || []);
    if (!credenciales.titulos_universitarios) credenciales.titulos_universitarios = {};
    credenciales.titulos_universitarios.pregrado = pregradoCalc.registros;
    credenciales.titulos_universitarios.posgrado = posgradoCalc.registros;

    const categoriaCalc = this.calcularHistorialCategoria(credenciales.historial_categoria || []);
    credenciales.historial_categoria = categoriaCalc.registros;
    const categoriaActual = this.getCategoriaActual(credenciales.historial_categoria);

    const experienciaCalc = this.calcularExperiencia(credenciales.experiencia_calificada?.tiempo_parcial || [], categoriaActual);
    const horaCatedraCalc = this.calcularHoraCatedra(credenciales.experiencia_calificada?.hora_catedra || [], categoriaActual);
    if (!credenciales.experiencia_calificada) credenciales.experiencia_calificada = {};
    credenciales.experiencia_calificada.tiempo_parcial = experienciaCalc.registros;
    credenciales.experiencia_calificada.hora_catedra = horaCatedraCalc.registros;

    const productividadCalc = this.calcularProductividad(credenciales.productividad_academica || []);
    credenciales.productividad_academica = productividadCalc.registros;

    const premiosCalc = this.calcularPremiosPatentes(credenciales.premios_y_patentes || []);
    credenciales.premios_y_patentes = premiosCalc.registros;

    const docenciaCalc = this.calcularDocenciaExtension(credenciales.docencia_destacada || [], categoriaActual);
    credenciales.docencia_destacada = docenciaCalc.registros;

    const extensionCalc = this.calcularDocenciaExtension(credenciales.extension_destacada || [], categoriaActual);
    credenciales.extension_destacada = extensionCalc.registros;

    // Calcular el resumen de puntos
    const puntos_totales = 
      pregradoCalc.acumulado + 
      posgradoCalc.acumulado + 
      categoriaCalc.total + 
      experienciaCalc.acumulado + 
      horaCatedraCalc.acumulado + 
      productividadCalc.acumulado + 
      premiosCalc.acumulado + 
      docenciaCalc.acumulado + 
      extensionCalc.acumulado;

    credenciales.resumen_puntos = {
      titulos_universitarios: Number((pregradoCalc.acumulado + posgradoCalc.acumulado).toFixed(2)),
      categoria: Number(categoriaCalc.total.toFixed(2)),
      experiencia_calificada: Number((experienciaCalc.acumulado + horaCatedraCalc.acumulado).toFixed(2)),
      productividad_academica: Number((productividadCalc.acumulado + docenciaCalc.acumulado + extensionCalc.acumulado).toFixed(2)),
      puntos_totales: Number(puntos_totales.toFixed(2)),
      ultimo_evento_numero: credenciales.resumen_puntos?.ultimo_evento_numero || 1,
      fecha_ultima_actualizacion: new Date().toISOString()
    };

    return credenciales;
  }
}

export default PuntajeService;
