// @ts-check
// Piezas de interfaz reutilizables. Devuelven HTML (con todo texto externo ya escapado) o conectan comportamiento.

import { esc, NIVEL, num } from "../formato.js";
import { icono } from "./iconos.js";

/** @typedef {import("../tipos.js").Nivel} Nivel */

/**
 * Busca un elemento y falla de forma explícita si la plantilla no lo generó.
 * @template {Element} [T=HTMLElement]
 * @param {string} selector
 * @param {ParentNode} [raiz]
 * @returns {T}
 */
export function $(selector, raiz = document) {
  const el = raiz.querySelector(selector);
  if (!el) throw new Error(`Falta el elemento ${selector} en la vista`);
  return /** @type {T} */ (el);
}

/** El nivel siempre se muestra con texto, no solo con color. @param {Nivel} nivel @param {boolean} [corto] */
export const chipNivel = (nivel, corto = false) =>
  `<span class="nivel nivel-${nivel}"><span class="nivel-punto" aria-hidden="true"></span>${corto ? NIVEL[nivel].corto : NIVEL[nivel].nombre}</span>`;

/**
 * @param {{ titulo: string, texto: string, accion?: { id: string, texto: string } }} o
 */
export const estadoVacio = (o) => `<div class="estado" role="status">
    ${icono("filtro", { clase: "estado-icono" })}
    <p class="estado-titulo">${esc(o.titulo)}</p>
    <p class="estado-texto">${esc(o.texto)}</p>
    ${o.accion ? `<button type="button" class="boton" id="${o.accion.id}">${esc(o.accion.texto)}</button>` : ""}
  </div>`;

/** @param {string} mensaje */
export const estadoError = (mensaje) => `<div class="estado estado-error" role="alert">
    ${icono("alerta", { clase: "estado-icono" })}
    <p class="estado-titulo">No se pudo mostrar esta página</p>
    <p class="estado-texto">${esc(mensaje)}.</p>
    <div class="estado-acciones">
      <button type="button" class="boton boton-primario" data-accion="reintentar">${icono("reintentar")}Reintentar</button>
      <a class="boton" href="#/">Ir al panorama</a>
    </div>
  </div>`;

/** Esqueleto de carga con la forma aproximada de la vista que viene. @param {"panorama" | "obra" | "modelo"} vista */
export function esqueleto(vista) {
  /** @param {string} w @param {number} [h] */
  const barra = (w, h = 14) => `<span class="hueso" style="width:${w};height:${h}px"></span>`;
  /** @param {number} h */
  const bloque = (h) => `<span class="hueso hueso-bloque" style="height:${h}px"></span>`;
  const cuerpo = vista === "panorama"
    ? `${barra("60%", 34)}${barra("40%")}<div class="hueso-fila">${bloque(96)}${bloque(96)}</div>${bloque(44)}${bloque(420)}`
    : vista === "obra"
      ? `${barra("30%")}${barra("70%", 30)}${barra("50%")}${bloque(44)}<div class="hueso-fila">${bloque(320)}${bloque(320)}</div>`
      : `${barra("50%", 34)}${barra("70%")}${bloque(180)}${bloque(320)}`;
  return `<div class="esqueleto" aria-hidden="true">${cuerpo}</div><p class="solo-lector" role="status">Cargando…</p>`;
}

/**
 * Explicación plegable para quien quiere entender un elemento sin cargar la pantalla.
 * @param {string} titulo @param {string} contenidoHtml
 */
export const ayuda = (titulo, contenidoHtml) => `<details class="ayuda">
    <summary>${icono("info")}<span>${esc(titulo)}</span></summary>
    <div class="ayuda-cuerpo">${contenidoHtml}</div>
  </details>`;

/**
 * Control segmentado (grupo de botones con aria-pressed).
 * @param {string} id @param {string} etiqueta @param {[string, string][]} opciones valor y texto @param {string} actual
 */
export const segmentado = (id, etiqueta, opciones, actual) => `<div class="segmentado" role="group" aria-label="${esc(etiqueta)}" id="${id}">
    ${opciones.map(([v, t]) => `<button type="button" data-valor="${esc(v)}" aria-pressed="${v === actual}">${t}</button>`).join("")}
  </div>`;

/**
 * Conecta un control segmentado: marca la opción elegida y avisa el nuevo valor.
 * @param {HTMLElement} grupo @param {(valor: string) => void} alCambiar
 */
export function conectarSegmentado(grupo, alCambiar) {
  grupo.addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("button[data-valor]");
    if (!(b instanceof HTMLButtonElement)) return;
    grupo.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    alCambiar(b.dataset.valor ?? "");
  });
}

/**
 * Paginador accesible. Muestra como máximo 7 botones de página.
 * @param {number} pagina 1..total @param {number} paginas
 */
export function paginador(pagina, paginas) {
  if (paginas <= 1) return "";
  /** @type {(number | "…")[]} */
  const lista = [];
  for (let p = 1; p <= paginas; p++) {
    if (p === 1 || p === paginas || Math.abs(p - pagina) <= 1) lista.push(p);
    else if (lista.at(-1) !== "…") lista.push("…");
  }
  /** @param {number} p @param {string} contenido @param {string} etiqueta @param {boolean} [deshabilitado] @param {boolean} [actual] */
  const boton = (p, contenido, etiqueta, deshabilitado = false, actual = false) =>
    `<button type="button" class="pagina" data-pagina="${p}" aria-label="${etiqueta}" ${actual ? 'aria-current="page"' : ""} ${deshabilitado ? "disabled" : ""}>${contenido}</button>`;
  return `<nav class="paginador" aria-label="Páginas de resultados">
      ${boton(pagina - 1, icono("izquierda"), "Página anterior", pagina === 1)}
      ${lista.map((p) => (p === "…" ? '<span class="pagina-salto" aria-hidden="true">…</span>' : boton(p, num(p), `Página ${p}`, false, p === pagina))).join("")}
      ${boton(pagina + 1, icono("derecha"), "Página siguiente", pagina === paginas)}
    </nav>`;
}

/**
 * Pestañas con el patrón ARIA (flechas, Inicio y Fin). Llama a alCambiar con el id de la pestaña elegida.
 * @param {HTMLElement} lista elemento con role="tablist" @param {(id: string) => void} alCambiar
 */
export function conectarPestanas(lista, alCambiar) {
  const pestanas = /** @type {HTMLButtonElement[]} */ ([...lista.querySelectorAll('[role="tab"]')]);
  /** @param {HTMLButtonElement} t @param {boolean} enfocar */
  const activar = (t, enfocar) => {
    pestanas.forEach((x) => {
      const activa = x === t;
      x.setAttribute("aria-selected", String(activa));
      x.tabIndex = activa ? 0 : -1;
      const panel = document.getElementById(x.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !activa;
    });
    if (enfocar) t.focus();
    alCambiar(t.dataset.pestana ?? "");
  };
  lista.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest('[role="tab"]');
    if (t instanceof HTMLButtonElement) activar(t, false);
  });
  lista.addEventListener("keydown", (e) => {
    const i = pestanas.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    if (i < 0) return;
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: pestanas.length - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    activar(pestanas[(destino + pestanas.length) % pestanas.length], true);
  });
}
