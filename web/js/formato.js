// @ts-check
// Formato de números, fechas y etiquetas compartidas por todas las vistas.

/** @typedef {import("./tipos.js").Nivel} Nivel */
/** @typedef {import("./tipos.js").EstadoConsulta} EstadoConsulta */

/** @type {Record<string, string>} */
const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escapa texto para insertarlo en HTML. @param {unknown} s */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/** @type {Map<number, Intl.NumberFormat>} */
const formatos = new Map();
/** @param {number} d */
const nf = (d) => {
  let f = formatos.get(d);
  if (!f) formatos.set(d, (f = new Intl.NumberFormat("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d })));
  return f;
};
/** @param {number} v @param {number} [d] */
export const num = (v, d = 0) => nf(d).format(v);
/** Proporción (0–1) como porcentaje. @param {number} v @param {number} [d] */
export const pct = (v, d = 0) => `${nf(d).format(100 * v)} %`;
/** @param {number} v */
export const millones = (v) => `S/ ${nf(0).format(v / 1e6)} millones`;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** @param {string} iso fecha AAAA-MM-DD */
export const fecha = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
};
/** @param {string} ym mes AAAA-MM */
export const mesCorto = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

/** @type {Record<Nivel, { nombre: string, corto: string }>} */
export const NIVEL = {
  ALTO: { nombre: "Riesgo alto", corto: "Alto" },
  MEDIO: { nombre: "Riesgo medio", corto: "Medio" },
  BAJO: { nombre: "Riesgo bajo", corto: "Bajo" },
};
/** @type {Nivel[]} */
export const NIVELES = ["ALTO", "MEDIO", "BAJO"];

/** @type {Record<EstadoConsulta, { clase: string, corto: string, explica: string }>} */
export const ESTADO = {
  "Sin respuesta en el cuaderno": { clase: "vencida", corto: "Vencida sin respuesta", explica: "Pasó el plazo legal y no hay respuesta anotada" },
  Tarde: { clase: "tarde", corto: "Respondida tarde", explica: "Se respondió después del plazo legal" },
  "En plazo": { clase: "plazo", corto: "Esperando, en plazo", explica: "Aún sin respuesta, pero dentro del plazo" },
  "A tiempo": { clase: "atiempo", corto: "Respondida a tiempo", explica: "Se respondió dentro del plazo legal" },
};
/** @type {EstadoConsulta[]} */
export const ESTADOS = ["Sin respuesta en el cuaderno", "Tarde", "En plazo", "A tiempo"];
