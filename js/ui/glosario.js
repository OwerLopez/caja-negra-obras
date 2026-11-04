// @ts-check
// Globos de definición («toggletips»): un botón junto a un término técnico muestra qué significa, en palabras simples.

import { esc } from "../formato.js";

/** Definiciones únicas para toda la web, para que un término signifique lo mismo en cada pantalla. */
export const GLOSARIO = {
  atraso: "Atraso legal: la obra anota que su avance real es menor al 80 % de lo programado o que debe acelerar su calendario. Es lo que el sistema intenta anticipar.",
  riesgo: "Probabilidad de que la obra anote un atraso legal en los próximos 60 días. Un 20 % significa que de cada 10 obras parecidas, unas 2 se atrasan.",
  nivel: "Alto: el 20 % de obras con mayor probabilidad. Medio: el 30 % siguiente. Bajo: el resto. Los cortes se fijaron antes de probar el sistema.",
  vencida: "Consulta que el residente anotó en el cuaderno y que no tiene respuesta registrada después del plazo legal: 5 días si responde el supervisor, 21 si interviene el proyectista.",
  cambio: "Diferencia entre la probabilidad de este mes y la del mes anterior, en puntos porcentuales.",
  razones: "Cada barra es lo que un dato de la obra aportó al cálculo del riesgo (método TreeSHAP). Rojo sube el riesgo, verde lo baja.",
  asiento: "Cada anotación del cuaderno de obra digital, con número, fecha, autor y texto. Es la prueba de lo que muestra el sistema.",
  prauc: "PR-AUC: mide qué tan bien el sistema pone primero a las obras que de verdad se atrasan. Revisar al azar obtiene la tasa base; un sistema perfecto obtiene 1.",
  precision20: "De cada 100 obras en el 20 % de mayor riesgo, cuántas se atrasaron de verdad.",
  lift: "Cuántas veces más atrasos encuentra el sistema que revisando la misma cantidad de obras al azar.",
  roc: "ROC-AUC: probabilidad de que el sistema ponga más arriba a una obra que se atrasó que a una que no. 0,5 equivale al azar.",
  brier: "Error promedio de la probabilidad. Mientras más bajo, más se puede creer el porcentaje.",
  empuja: "El dato de la obra que más subió su riesgo en el cálculo (la barra roja más larga de su ficha).",
  p: "Valor p del bootstrap pareado: qué tan probable es que la ventaja de Caja Negra sea solo suerte. Menor a 0,05 se considera concluyente.",
};

/** @typedef {keyof typeof GLOSARIO} ClaveGlosario */

let siguiente = 0;

/**
 * Solo el botón «?» con su globo, para poner junto a un texto que ya existe (por ejemplo, un encabezado de tabla).
 * @param {string} texto nombre del término, para el lector de pantalla
 * @param {ClaveGlosario} clave
 */
export function definicion(texto, clave) {
  const id = `def-${(siguiente += 1)}`;
  return `<span class="termino"><button type="button" class="termino-boton" aria-expanded="false" aria-controls="${id}"
    aria-label="Qué significa ${esc(texto)}">?</button><span class="termino-globo" id="${id}" role="note" hidden>${esc(GLOSARIO[clave])}</span></span>`;
}

/**
 * Término con su globo de definición.
 * @param {string} texto texto visible del término
 * @param {keyof typeof GLOSARIO} clave
 */
export function termino(texto, clave) {
  const id = `def-${(siguiente += 1)}`;
  return `<span class="termino">${esc(texto)}<button type="button" class="termino-boton" aria-expanded="false" aria-controls="${id}"
    aria-label="Qué significa ${esc(texto)}">?</button><span class="termino-globo" id="${id}" role="note" hidden>${esc(GLOSARIO[clave])}</span></span>`;
}

/** Conecta todos los globos de definición del documento (una sola vez, por delegación). */
export function conectarGlosario() {
  /** @param {Element} [excepto] */
  const cerrarTodos = (excepto) => document.querySelectorAll('.termino-boton[aria-expanded="true"]').forEach((b) => {
    if (b === excepto) return;
    b.setAttribute("aria-expanded", "false");
    /** @type {HTMLElement | null} */ (document.getElementById(b.getAttribute("aria-controls") ?? ""))?.setAttribute("hidden", "");
  });
  document.addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest(".termino-boton");
    if (!(b instanceof HTMLButtonElement)) { if (!(/** @type {HTMLElement} */ (e.target).closest(".termino-globo"))) cerrarTodos(); return; }
    e.preventDefault();
    e.stopPropagation();
    const abierto = b.getAttribute("aria-expanded") === "true";
    cerrarTodos(b);
    b.setAttribute("aria-expanded", String(!abierto));
    const globo = document.getElementById(b.getAttribute("aria-controls") ?? "");
    if (!globo) return;
    globo.toggleAttribute("hidden", abierto);
    if (abierto) return;
    // mantener el globo dentro de la pantalla
    globo.style.left = "0px";
    globo.style.right = "auto";
    const r = globo.getBoundingClientRect();
    const exceso = r.right - (window.innerWidth - 8);
    if (exceso > 0) globo.style.left = `${-Math.min(exceso, r.left - 8)}px`;
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarTodos(); });
}
