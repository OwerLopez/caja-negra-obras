// @ts-check
// Ficha de una obra: riesgo y sus razones, consultas con la prueba escrita e historia del cuaderno, en pestañas.

import * as D from "../datos.js";
import { aportes, lineaRiesgo } from "../graficos.js";
import { esc, fecha, num, pct } from "../formato.js";
import { enlace, reemplazar } from "../router.js";
import { $, chipNivel, conectarPestanas } from "../ui/componentes.js";
import { termino } from "../ui/glosario.js";
import { icono } from "../ui/iconos.js";
import { conectarConsultas, conectarHistoria, panelConsultas, panelHistoria } from "./obra-paneles.js";

/** @typedef {import("../tipos.js").Ficha} Ficha */
/** @typedef {import("../tipos.js").Modelo} Modelo */

const PESTANAS = ["resumen", "consultas", "historia"];

/** @param {Ficha} o @param {Modelo} mod */
function lectura(o, mod) {
  const r = o.riesgo;
  const suben = r.aportes.filter((a) => a.peso > 0).slice(0, 3).map((a) => esc(a.frase.charAt(0).toLowerCase() + a.frase.slice(1)));
  return `<p class="lectura">Probabilidad de <b>${pct(r.probabilidad, 1)}</b>: ${num(r.veces_tasa_base, 1)} veces la tasa base de Arequipa
    (${pct(mod.resultados.arequipa.prevalencia, 1)}). En la prueba del modelo, el ${pct(r.tasa_observada_nivel, 1)} de los casos con este nivel terminó en atraso.
    ${suben.length ? `Lo que más empuja el riesgo: ${suben.join("; ")}.` : ""}</p>`;
}

/** Nombre corto de los indicadores clave que publica p05, para listar los que no tienen dato. */
const NOMBRE_INDICADOR = {
  plazo_consumido: "plazo consumido", dias_restantes_plazo: "días restantes del plazo", avance_reportado: "avance físico reportado",
  plazo_vs_avance: "plazo frente a avance", ampliaciones: "ampliaciones de plazo", consultas_vencidas: "consultas vencidas",
  devengado_sobre_viable: "dinero pagado frente a la inversión", meses_sin_devengado: "meses sin pagos", contratista_atrasos_previos: "atrasos previos del contratista",
  entidad_atrasos_previos: "atrasos previos de la entidad", lluvias_en_horizonte: "temporada de lluvias", log_monto_contratado: "monto contratado",
};

/** @param {Ficha} o */
function indicadores(o) {
  /** @type {Map<string, Ficha["indicadores"]>} */
  const grupos = new Map();
  o.indicadores.filter((x) => x.frase).forEach((x) => grupos.set(x.grupo, [...(grupos.get(x.grupo) ?? []), x]));
  const faltan = o.indicadores.filter((x) => !x.frase).map((x) => /** @type {Record<string, string>} */ (NOMBRE_INDICADOR)[x.variable] ?? x.variable);
  return `<div class="indicadores">${[...grupos].map(([g, lista]) => `<div class="indicador-grupo"><h3>${esc(g)}</h3><ul>
      ${lista.map((x) => `<li>${esc(x.frase)}</li>`).join("")}</ul></div>`).join("")}</div>
    ${faltan.length ? `<p class="nota sin-dato-nota">${icono("info")}Sin dato en las fuentes oficiales para esta obra: ${esc(faltan.join(", "))}.</p>` : ""}`;
}

/** @param {Ficha} o @param {Modelo} mod */
const panelResumen = (o, mod) => `<div class="rejilla-2">
    <section class="bloque" aria-labelledby="t-razones">
      <h2 id="t-razones">Por qué tiene este riesgo</h2><p class="panel-bajada">Datos de la obra que más influyeron en el cálculo (${termino("cómo leerlos", "razones")}).</p>
      ${lectura(o, mod)}
      <div class="leyenda" aria-hidden="true"><span class="ley-baja">Baja el riesgo</span><span class="ley-sube">Sube el riesgo</span></div>
      ${aportes(o.riesgo.aportes)}
      <p class="nota">Se muestran los ocho datos de mayor efecto. El cálculo completo, con un ejemplo resuelto, está en
        <a href="${enlace(["modelo", "ejemplo"])}">Cómo funciona</a>.</p>
    </section>
    <section class="bloque" aria-labelledby="t-evolucion">
      <h2 id="t-evolucion">Evolución mes a mes</h2>
      <p class="panel-bajada">Probabilidad calculada al cierre de cada mes, solo con lo escrito hasta esa fecha.</p>
      ${lineaRiesgo(o.riesgo.historia, { alto: mod.niveles.umbral_alto, medio: mod.niveles.umbral_medio })}
    </section>
  </div>
  <section class="bloque" aria-labelledby="t-indicadores">
    <h2 id="t-indicadores">Indicadores clave</h2>
    <p class="panel-bajada">Datos concretos de plazo, avance, dinero, historial de los actores y temporada.</p>
    ${indicadores(o)}
  </section>`;

/**
 * @param {HTMLElement} main
 * @param {string} id
 * @param {string | undefined} sub pestaña pedida en la URL
 */
export async function render(main, id, sub) {
  const [o, mod, meta] = await Promise.all([D.obra(id), D.modelo(), D.meta()]);
  document.title = `${o.nombre.slice(0, 60)} · Caja Negra de Obra`;
  const r = o.riesgo;
  const activa = sub && PESTANAS.includes(sub) ? sub : "resumen";
  const vencidas = o.consultas_resumen["Sin respuesta en el cuaderno"];
  /** @param {string} pid @param {string} titulo @param {string} [extra] */
  const pestana = (pid, titulo, extra = "") => `<button type="button" role="tab" id="tab-${pid}" data-pestana="${pid}" aria-controls="panel-${pid}"
      aria-selected="${pid === activa}" tabindex="${pid === activa ? 0 : -1}">${titulo}${extra}</button>`;
  /** @param {string} pid @param {string} html */
  const panel = (pid, html) => `<div role="tabpanel" id="panel-${pid}" aria-labelledby="tab-${pid}" tabindex="0" class="panel" ${pid === activa ? "" : "hidden"}>${html}</div>`;

  main.innerHTML = `
  <nav class="migas" aria-label="Ruta"><a href="#/">${icono("izquierda")}Panorama</a></nav>
  <header class="ficha-cabeza">
    <div class="ficha-identidad">
      <h1 class="ficha-titulo">${esc(o.nombre)}</h1>
      <dl class="ficha-datos">
        <div><dt>Entidad</dt><dd>${esc(o.entidad)}</dd></div>
        <div><dt>Contratista</dt><dd>${esc(o.contratista || "No registrado")}</dd></div>
        <div><dt>Ubicación</dt><dd>${esc(o.distrito)}, ${esc(o.provincia)}</dd></div>
        ${o.cui ? `<div><dt>CUI</dt><dd class="num">${esc(o.cui)}</dd></div>` : ""}
        <div><dt>Cuaderno</dt><dd>${fecha(o.primer_asiento)} a ${fecha(o.ultimo_asiento)}</dd></div>
      </dl>
    </div>
    <aside class="ficha-riesgo riesgo-${r.nivel}" aria-label="Riesgo de atraso">
      <p class="ficha-riesgo-etiqueta">${termino("Riesgo de atraso legal", "riesgo")} en ${mod.horizonte_dias} días</p>
      <p class="ficha-riesgo-cifra num">${pct(r.probabilidad, 1)}</p>
      ${chipNivel(r.nivel)}
      <p class="ficha-riesgo-nota">${num(r.veces_tasa_base, 1)} veces la tasa base. Corte del ${fecha(meta.corte)}.</p>
    </aside>
  </header>

  <div class="pestanas" role="tablist" aria-label="Secciones de la ficha">
    ${pestana("resumen", "Resumen")}
    ${pestana("consultas", "Consultas", ` <span class="cuenta${vencidas ? " cuenta-alerta" : ""}" ${vencidas ? `title="${num(vencidas)} vencidas sin respuesta"` : ""}>${num(o.consultas.length)}</span>`)}
    ${pestana("historia", "Historia del cuaderno", ` <span class="cuenta">${num(o.hitos.length)}</span>`)}
  </div>
  ${panel("resumen", panelResumen(o, mod))}
  ${panel("consultas", panelConsultas(o, meta.corte))}
  ${panel("historia", panelHistoria(o))}`;

  conectarPestanas($('[role="tablist"]', main), (p) => reemplazar(p === "resumen" ? ["obra", id] : ["obra", id, p]));
  conectarConsultas($("#panel-consultas", main));
  conectarHistoria($("#panel-historia", main));
}
