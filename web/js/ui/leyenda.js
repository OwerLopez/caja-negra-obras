// @ts-check
// Leyenda: una ventana que explica, en un solo lugar, cada color y símbolo que usa la web.

import { pct } from "../formato.js";
import { chipNivel } from "./componentes.js";
import { icono } from "./iconos.js";

/** @typedef {import("../tipos.js").Modelo} Modelo */

/** @param {string} clase @param {string} texto @param {string} explica */
const muestra = (clase, texto, explica) => `<li><span class="muestra ${clase}" aria-hidden="true"></span><span><b>${texto}</b> ${explica}</span></li>`;

/** @param {Modelo} mod */
function contenido(mod) {
  const n = mod.niveles;
  return `<div class="leyenda-cuerpo">
    <section><h3>Nivel de riesgo de una obra</h3>
      <ul class="leyenda-lista">
        <li>${chipNivel("ALTO")}<span>Probabilidad desde ${pct(n.umbral_alto, 1)}. Conviene revisarla primero.</span></li>
        <li>${chipNivel("MEDIO")}<span>Desde ${pct(n.umbral_medio, 1)}. Vigilar.</span></li>
        <li>${chipNivel("BAJO")}<span>Menos de ${pct(n.umbral_medio, 1)}.</span></li>
      </ul>
      <p class="nota">La probabilidad es de caer en atraso legal en los próximos 60 días. Un 20 % significa que de cada 10 obras parecidas, unas 2 se atrasan.</p></section>
    <section><h3>Cambio frente al mes anterior</h3>
      <ul class="leyenda-lista">
        <li><span class="sube">${icono("sube")}+5 pts</span><span>El riesgo subió.</span></li>
        <li><span class="baja">${icono("baja")}−5 pts</span><span>El riesgo bajó.</span></li>
      </ul></section>
    <section><h3>Estado de las consultas del residente</h3>
      <ul class="leyenda-lista">
        ${muestra("m-vencida", "Vencida sin respuesta:", "pasó el plazo legal y no hay respuesta anotada en el cuaderno.")}
        ${muestra("m-tarde", "Respondida tarde:", "se respondió después del plazo legal.")}
        ${muestra("m-plazo", "Esperando, en plazo:", "aún sin respuesta, pero todavía dentro del plazo.")}
        ${muestra("m-atiempo", "Respondida a tiempo:", "se respondió dentro del plazo legal.")}
      </ul>
      <p class="nota">Plazo legal: 5 días si responde el supervisor o inspector; 21 si interviene la entidad con el proyectista (días calendario).</p></section>
    <section><h3>Razones del riesgo</h3>
      <ul class="leyenda-lista">
        ${muestra("m-sube", "Barra roja:", "ese dato subió el riesgo de la obra.")}
        ${muestra("m-baja", "Barra verde:", "ese dato bajó el riesgo.")}
      </ul>
      <p class="nota">Mientras más larga la barra, más pesó ese dato en el cálculo.</p></section>
    <section><h3>Gráficos</h3>
      <ul class="leyenda-lista">
        ${muestra("m-linea", "Línea azul:", "probabilidad de la obra al cierre de cada mes.")}
        ${muestra("m-franja-alto", "Franja roja:", "zona de riesgo alto.")}
        ${muestra("m-franja-medio", "Franja ámbar:", "zona de riesgo medio.")}
        ${muestra("m-asientos", "Barra azul:", "anotaciones del cuaderno en el mes.")}
        ${muestra("m-consultas", "Barra ámbar:", "consultas del residente en el mes.")}
        ${muestra("m-punto", "Punto rojo:", "mes con suspensión, ampliación, riesgo o penalidad anotados.")}
      </ul></section>
    <section><h3>Prueba escrita</h3>
      <div class="leyenda-asiento"><div class="sello" aria-hidden="true">Asiento<b>74</b></div>
        <p>La hoja clara con un número sellado es el <b>texto original del cuaderno de obra</b> (el asiento). Es la prueba de lo que muestra el sistema. Los nombres de personas aparecen como [persona].</p></div></section>
    <section><h3>Símbolos de ayuda</h3>
      <ul class="leyenda-lista">
        <li><span class="termino-boton" aria-hidden="true">?</span><span>Junto a una palabra técnica: tócalo para ver qué significa.</span></li>
        <li>${icono("info")}<span><b>Recorrido guiado</b> (barra superior): explica la pantalla paso a paso.</span></li>
        <li><span class="sin-dato-muestra">Sin dato</span><span>La fuente oficial no registra ese dato para la obra.</span></li>
      </ul></section>
  </div>`;
}

/** @type {HTMLDialogElement | null} */
let dialogo = null;

/**
 * Abre la leyenda (la crea la primera vez).
 * @param {Modelo} mod
 */
export function abrirLeyenda(mod) {
  if (!dialogo) {
    dialogo = document.createElement("dialog");
    dialogo.className = "leyenda-dialogo";
    dialogo.setAttribute("aria-labelledby", "leyenda-titulo");
    dialogo.innerHTML = `<div class="leyenda-cabeza"><h2 id="leyenda-titulo">Leyenda: qué significa cada color y símbolo</h2>
      <button type="button" class="boton" data-accion="cerrar-leyenda">${icono("cerrar")}Cerrar</button></div>${contenido(mod)}`;
    dialogo.addEventListener("click", (e) => {
      const d = /** @type {HTMLDialogElement} */ (dialogo);
      if (e.target === d || /** @type {HTMLElement} */ (e.target).closest('[data-accion="cerrar-leyenda"]')) d.close();
    });
    document.body.append(dialogo);
  }
  dialogo.showModal();
}
