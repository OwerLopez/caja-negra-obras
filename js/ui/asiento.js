// @ts-check
// La hoja del cuaderno: el texto original de un asiento con su número sellado. Es la prueba de cada afirmación.

import { esc, num } from "../formato.js";

/**
 * @param {{ nro: number, titulo: string, texto: string }} a
 * @param {string} rotulo quién y cuándo (texto ya escapado)
 */
export const hojaAsiento = (a, rotulo) => `<figure class="asiento">
    <div class="sello" aria-hidden="true">Asiento<b>${num(a.nro)}</b></div>
    <figcaption><span class="solo-lector">Asiento ${num(a.nro)}. </span>${rotulo}</figcaption>
    <blockquote>${a.titulo ? `<strong>${esc(a.titulo)}.</strong> ` : ""}${esc(a.texto)}</blockquote>
  </figure>`;
