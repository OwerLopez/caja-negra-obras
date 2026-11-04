// @ts-check
// Tipos del contrato de datos que publica scripts/p05_exportar.py (solo JSDoc: este archivo no ejecuta nada).

/** @typedef {"ALTO" | "MEDIO" | "BAJO"} Nivel */
/** @typedef {"Sin respuesta en el cuaderno" | "Tarde" | "En plazo" | "A tiempo"} EstadoConsulta */

/**
 * @typedef {object} Meta
 * @property {number} esquema
 * @property {string} corte
 * @property {string} generado
 * @property {string | null} commit
 * @property {number} obras
 * @property {{ huella: string, calibrador: string, arboles: number, indicadores: number, seleccionado: string }} modelo
 * @property {string[]} fuentes
 */

/**
 * @typedef {object} ObraResumen
 * @property {string} id
 * @property {string} nombre
 * @property {string} entidad
 * @property {string} provincia
 * @property {string} distrito
 * @property {number} probabilidad
 * @property {Nivel} nivel
 * @property {number | null} tendencia
 * @property {number} consultas_vencidas
 * @property {number} consultas_tarde
 * @property {string} razon
 */

/**
 * @typedef {object} Resumen
 * @property {string} corte
 * @property {string} fuente
 * @property {number} obras
 * @property {Partial<Record<Nivel, number>>} por_nivel
 * @property {{ consultas_residente: number, veredicto: Record<EstadoConsulta, number>, respondidas_enlazadas: number,
 *   pct_respondidas_enlazadas: number, dias_respuesta: { mediana: number, p75: number, p90: number }, pct_tarde_entre_respondidas: number }} consultas_arequipa
 * @property {{ directo: number, con_proyectista: number }} plazos
 * @property {{ respuestas: number, candidatos_promedio: number, azar: number, regla_mas_reciente: number, solo_similitud_texto: number,
 *   modelo_ia: number, modelo_ia_ic95: [number, number], umbral: number, cobertura_con_umbral: number, precision_con_umbral: number }} emparejador
 * @property {{ fuente: string, obras_paralizadas_arequipa: number, costo_actualizado_arequipa: number, saldo_arequipa: number,
 *   obras_paralizadas_pais: number, costo_actualizado_pais: number }} contraloria
 */

/** @typedef {{ variable: string, grupo: string, frase: string, peso: number }} Aporte */
/** @typedef {{ nro: number, titulo: string, texto: string }} Asiento */

/**
 * @typedef {object} Consulta
 * @property {number} nro
 * @property {string} fecha
 * @property {string} titulo
 * @property {string} texto
 * @property {EstadoConsulta} estado
 * @property {number} dias
 * @property {number} plazo
 * @property {string} responsable
 * @property {(Asiento & { fecha: string, metodo: string, confianza: number }) | null} respuesta
 */

/**
 * @typedef {object} Ficha
 * @property {string} id
 * @property {string} nombre
 * @property {string} entidad
 * @property {string | null} contratista
 * @property {string} provincia
 * @property {string} distrito
 * @property {string | null} cui
 * @property {string} primer_asiento
 * @property {string} ultimo_asiento
 * @property {{ probabilidad: number, nivel: Nivel, tasa_observada_nivel: number, veces_tasa_base: number, aportes: Aporte[],
 *   historia: { mes: string, p: number }[] }} riesgo
 * @property {{ variable: string, grupo: string, valor: number | string | null, frase: string | null }[]} indicadores
 * @property {Record<EstadoConsulta, number>} consultas_resumen
 * @property {Consulta[]} consultas
 * @property {(Asiento & { fecha: string, tipo: string, rol: string })[]} hitos
 * @property {{ mes: string, asientos: number, consultas: number, alertas: number }[]} meses
 */

/**
 * @typedef {object} MetricasModelo
 * @property {number} pr_auc
 * @property {number} roc_auc
 * @property {number} precision_top20
 * @property {number} recall_top20
 * @property {number} lift_top20
 * @property {number} [brier]
 * @property {[number, number]} [pr_auc_ic95]
 */

/**
 * @typedef {object} ResultadoAmbito
 * @property {number} filas
 * @property {number} positivos
 * @property {number} obras
 * @property {number} prevalencia
 * @property {Record<string, MetricasModelo>} modelos
 * @property {Record<string, { diferencia_pr_auc: number, ic95: [number, number], p_unilateral: number }>} comparacion_pareada
 */

/** @typedef {{ nivel: Nivel, filas: number, eventos: number, tasa_observada: number, prob_media: number }} FilaNivel */
/** @typedef {{ obras_con_evento: number, alertadas_antes: number, pct_alertadas: number, dias_anticipacion_mediana: number, dias_anticipacion_p25_p75: [number, number] }} Anticipacion */
/** @typedef {{ filas: number, positivos: number, obras: number, desde: string, hasta: string }} Bloque */

/**
 * @typedef {object} Modelo
 * @property {Record<string, string>} grupos
 * @property {{ variable: string, grupo: string, formula: string, fuente: string, por_que: string, cobertura_arequipa: number, importancia: number }[]} catalogo
 * @property {Record<string, number>} importancia_grupo
 * @property {{ pr_auc_modelo_8_grupos: Record<string, number>, por_grupo: Record<string, Record<"validacion" | "arequipa" | "nacional", { pr_auc_sin_grupo: number, caida: number }>> }} ablacion
 * @property {{ pr_auc_validacion: Record<string, number>, modelo_final: string }} seleccion
 * @property {{ arequipa: ResultadoAmbito, nacional: ResultadoAmbito }} resultados
 * @property {{ umbral_alto: number, umbral_medio: number, arequipa: FilaNivel[], nacional: FilaNivel[] }} niveles
 * @property {{ arequipa: Anticipacion, nacional: Anticipacion }} anticipacion
 * @property {{ decil: number, prob_media: number, tasa_observada: number, filas: number }[]} calibracion_nacional
 * @property {{ entrenamiento: Bloque, validacion: Bloque, prueba: Bloque }} particion
 * @property {number} base_logit
 * @property {{ A: number, B: number }} platt
 * @property {number} arboles
 * @property {{ learning_rate: number, num_leaves: number, min_data_in_leaf: number, lambda_l2: number, bagging_fraction: number, feature_fraction: number }} hiperparametros
 * @property {number} horizonte_dias
 */

export {};
