// @ts-check
// Paneles «Consultas» e «Historia» de la ficha de obra.

import { actividad } from "../graficos.js";
import { esc, ESTADO, ESTADOS, fecha, num, pct } from "../formato.js";
import { hojaAsiento } from "../ui/asiento.js";
import { $, estadoVacio } from "../ui/componentes.js";
import { termino } from "../ui/glosario.js";
import { icono } from "../ui/iconos.js";

/** @typedef {import("../tipos.js").Ficha} Ficha */
/** @typedef {import("../tipos.js").Consulta} Consulta */

const LOTE_CONSULTAS = 10;
const LOTE_HITOS = 8;

/** @param {Consulta} c @param {number} i @param {string} corte */
function consulta(c, i, corte) {
  const e = ESTADO[c.estado];
  const r = c.respuesta;
  const tiempo = r ? `respondida en ${num(c.dias)} ${c.dias === 1 ? "día" : "días"}` : `${num(c.dias)} ${c.dias === 1 ? "día" : "días"} esperando`;
  return `<li class="consulta" data-estado="${esc(c.estado)}">
    <button type="button" class="consulta-cabeza" aria-expanded="false" aria-controls="prueba-${i}">
      <span class="consulta-titulo">${esc(c.titulo || `Consulta del asiento ${c.nro}`)}</span>
      <span class="consulta-meta">Asiento ${num(c.nro)}, ${fecha(c.fecha)}. Debe responder: ${esc(c.responsable)} (plazo ${num(c.plazo)} días)</span>
      <span class="consulta-estado estado-${e.clase}"><b>${e.corto}</b><span>${tiempo}</span></span>
      ${icono("abajo", { clase: "consulta-flecha" })}
    </button>
    <div class="consulta-prueba" id="prueba-${i}" hidden>
      ${hojaAsiento(c, `Consulta del residente, ${fecha(c.fecha)}`)}
      ${r
        ? hojaAsiento(r, `Respuesta del ${fecha(r.fecha)}. Enlace: ${esc(r.metodo.toLowerCase())}${r.confianza < 1 ? ` (confianza ${pct(r.confianza)})` : ""}`)
        : `<p class="nota">${icono("info")}No hay en el cuaderno un asiento que responda esta consulta hasta el ${fecha(corte)}.
           ${c.estado === "Sin respuesta en el cuaderno" ? "Vencido el plazo, el contratista puede pedir ampliación de plazo (RLCE art. 193; RLGCP art. 190). La respuesta pudo enviarse por carta: el sistema solo ve el cuaderno." : ""}</p>`}
    </div>
  </li>`;
}

/** @param {Ficha} o @param {string} corte */
export function panelConsultas(o, corte) {
  if (!o.consultas.length) return estadoVacio({ titulo: "Esta obra no registra consultas del residente", texto: "Cuando el residente anote una consulta, aparecerá aquí con su plazo legal y su estado." });
  const orden = [...o.consultas].sort((a, b) => ESTADOS.indexOf(a.estado) - ESTADOS.indexOf(b.estado) || b.dias - a.dias);
  return `<p class="panel-bajada">Cada consulta tiene un plazo legal: 5 días si responde el supervisor o inspector y 21 si interviene la entidad con el proyectista
      (días calendario). Elige un estado para filtrar y abre una consulta para ver el ${termino("asiento", "asiento")} original.</p>
    <div class="filtro-estados" role="group" aria-label="Filtrar consultas por estado">
      <button type="button" data-estado="" aria-pressed="true"><b class="num">${num(o.consultas.length)}</b><span>Todas</span></button>
      ${ESTADOS.map((s) => `<button type="button" data-estado="${esc(s)}" aria-pressed="false" class="estado-${ESTADO[s].clase}" ${o.consultas_resumen[s] ? "" : "disabled"}>
        <b class="num">${num(o.consultas_resumen[s])}</b><span>${ESTADO[s].corto}</span></button>`).join("")}
    </div>
    <ul class="consultas" id="consultas">${orden.map((c, i) => consulta(c, i, corte)).join("")}</ul>
    <button type="button" class="boton boton-bloque" id="mas-consultas" hidden></button>`;
}

/** @param {HTMLElement} raiz */
export function conectarConsultas(raiz) {
  const lista = raiz.querySelector("#consultas");
  if (!lista) return;
  let filtro = "", todas = false;
  const mas = /** @type {HTMLButtonElement} */ ($("#mas-consultas", raiz));
  const mostrar = () => {
    let coinciden = 0;
    lista.querySelectorAll(".consulta").forEach((li) => {
      const ok = !filtro || /** @type {HTMLElement} */ (li).dataset.estado === filtro;
      /** @type {HTMLElement} */ (li).hidden = !ok || (!todas && coinciden >= LOTE_CONSULTAS);
      if (ok) coinciden += 1;
    });
    mas.hidden = todas || coinciden <= LOTE_CONSULTAS;
    mas.textContent = `Mostrar las ${num(coinciden)} consultas`;
  };
  lista.addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest(".consulta-cabeza");
    if (!(b instanceof HTMLButtonElement)) return;
    const abierta = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(abierta));
    /** @type {HTMLElement} */ ($(`#${b.getAttribute("aria-controls")}`, raiz)).hidden = !abierta;
  });
  $(".filtro-estados", raiz).addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("button[data-estado]");
    if (!(b instanceof HTMLButtonElement)) return;
    raiz.querySelectorAll(".filtro-estados button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    filtro = b.dataset.estado ?? "";
    mostrar();
  });
  mas.addEventListener("click", () => {
    todas = true;
    mostrar();
    /** @type {HTMLElement | null} */ (lista.querySelector(`.consulta:nth-child(${LOTE_CONSULTAS + 1}) .consulta-cabeza`))?.focus();
  });
  mostrar();
}

/** @param {Ficha} o */
export function panelHistoria(o) {
  const hitos = [...o.hitos].reverse();
  return `<p class="panel-bajada">Asientos anotados cada mes; en ámbar, las consultas del residente. Un punto rojo marca meses con suspensión,
      ampliación, riesgo o penalidad anotados.</p>
    <div class="leyenda" aria-hidden="true"><span class="ley-asientos">Asientos</span><span class="ley-consultas">Consultas</span><span class="ley-alertas">Hechos formales</span></div>
    ${o.meses.length ? actividad(o.meses) : ""}
    <h2 class="subtitulo">Hechos formales del cuaderno</h2>
    ${hitos.length
      ? `<ol class="hitos" id="hitos">${hitos.map((h, i) => `<li ${i >= LOTE_HITOS ? "hidden" : ""}>${hojaAsiento(h, `${esc(h.tipo)}, anotado por ${esc(h.rol.toLowerCase())} el ${fecha(h.fecha)}`)}</li>`).join("")}</ol>
         ${hitos.length > LOTE_HITOS ? `<button type="button" class="boton boton-bloque" id="mas-hitos">Mostrar los ${num(hitos.length)} hechos</button>` : ""}`
      : `<ol class="hitos" id="hitos"></ol>${estadoVacio({ titulo: "Sin hechos formales anotados", texto: "El cuaderno no registra inicio del plazo, suspensiones, ampliaciones, adicionales, penalidades ni riesgos." })}`}`;
}

/** @param {HTMLElement} raiz */
export function conectarHistoria(raiz) {
  raiz.querySelector("#mas-hitos")?.addEventListener("click", (e) => {
    raiz.querySelectorAll("#hitos li[hidden]").forEach((li) => { /** @type {HTMLElement} */ (li).hidden = false; });
    /** @type {HTMLElement} */ (e.currentTarget).remove();
  });
}
