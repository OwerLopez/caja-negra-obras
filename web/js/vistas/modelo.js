// @ts-check
// «Cómo funciona»: primero en palabras simples para todo público; luego el detalle técnico para especialistas.
// Cada sección tiene su propia URL (#/modelo/<sección>).

import * as D from "../datos.js";
import { esc, num, pct } from "../formato.js";
import { reemplazar } from "../router.js";
import { $, conectarSegmentado, estadoVacio, segmentado } from "../ui/componentes.js";
import { icono } from "../ui/iconos.js";
import * as S from "./modelo-secciones.js";

/** @typedef {import("../tipos.js").Modelo} Modelo */

/** @type {[string, string][]} */
const PARA_TODOS = [["simple", "En palabras simples"]];
/** @type {[string, string][]} */
const PARA_ESPECIALISTAS = [
  ["formulas", "Fórmulas"], ["ejemplo", "Ejemplo resuelto"], ["resultados", "Qué tan bien acierta"], ["niveles", "Niveles y anticipación"],
  ["pesos", "Qué pesa en el modelo"], ["enlace", "Enlace de consultas"], ["indicadores", "Los indicadores"], ["datos", "Datos y límites"],
];
const SECCIONES = [...PARA_TODOS, ...PARA_ESPECIALISTAS];

/** Observador del índice: se desconecta al volver a dibujar la vista para no acumular observadores. */
/** @type {IntersectionObserver | null} */
let observador = null;

/** @param {Modelo} mod @param {string} grupo @param {string} texto */
function filasCatalogo(mod, grupo, texto) {
  const t = texto.trim().toLocaleLowerCase("es");
  const lista = mod.catalogo.filter((c) => (!grupo || c.grupo === grupo)
    && (!t || `${c.variable} ${c.formula} ${c.por_que} ${c.fuente}`.toLocaleLowerCase("es").includes(t)));
  if (!lista.length) return `<tr><td colspan="5">${estadoVacio({ titulo: "Ningún indicador coincide", texto: "Prueba con otra palabra o elige «Todos los grupos»." })}</td></tr>`;
  return lista.map((c) => `<tr>
      <th scope="row"><span class="indicador-nombre">${esc(c.por_que)}</span><code>${esc(c.variable)}</code></th>
      <td class="formula-celda">${esc(c.formula)}</td><td>${esc(c.fuente)}</td>
      <td class="der num">${num(c.cobertura_arequipa, 0)} %</td><td class="der num">${num(c.importancia, 1)} %</td></tr>`).join("");
}

/** @param {string} id @param {string} titulo @param {string} cuerpo @param {string} [bajada] */
const seccion = (id, titulo, cuerpo, bajada = "") => `<section class="seccion-modelo" id="${id}" aria-labelledby="t-${id}" tabindex="-1">
    <h2 id="t-${id}">${titulo}</h2>${bajada ? `<p class="panel-bajada">${bajada}</p>` : ""}${cuerpo}</section>`;

/**
 * @param {HTMLElement} main
 * @param {string | undefined} sub sección pedida en la URL
 */
export async function render(main, sub) {
  const [mod, res, obras] = await Promise.all([D.modelo(), D.resumen(), D.obras()]);
  const primera = await D.obra(obras[0].id);
  document.title = "Cómo funciona · Caja Negra de Obra";
  const sel = mod.seleccion.pr_auc_validacion;
  const aqp = mod.resultados.arequipa;
  const grupos = Object.values(mod.grupos);

  const an = mod.anticipacion.arequipa;
  const p20 = aqp.modelos["M Caja Negra"].precision_top20;
  /** @param {[string, string][]} lista */
  const enlacesIndice = (lista) => lista.map(([id, t]) => `<li><a href="#/modelo/${id}" data-seccion="${id}">${t}</a></li>`).join("");

  main.innerHTML = `
  <header class="pagina-cabeza">
    <h1>Cómo funciona el sistema</h1>
    <p class="bajada">La primera parte explica, en palabras simples, cómo se calcula el riesgo y qué tan confiable es. La segunda reúne el detalle técnico
      (fórmulas, métricas y validación) para que cualquier especialista pueda verificar cada cifra.</p>
  </header>
  <div class="documento">
    <nav class="indice" aria-label="Secciones de esta página">
      <p class="indice-titulo">Para todos</p>
      <ul>${enlacesIndice(PARA_TODOS)}</ul>
      <p class="indice-titulo">Para especialistas</p>
      <ul>${enlacesIndice(PARA_ESPECIALISTAS)}</ul>
    </nav>
    <div class="documento-cuerpo">
      ${seccion("simple", "En palabras simples", `${S.pasos(mod)}
        <div class="claves">
          <div class="clave"><h3>Cómo leer una probabilidad</h3>
            <p>Un riesgo de 20 % significa que de cada 10 obras en una situación parecida, unas 2 terminan en atraso legal en los próximos 60 días.
              No dice cuál de ellas: por eso sirve para decidir qué revisar primero.</p></div>
          <div class="clave"><h3>Qué tan confiable es</h3>
            <p>Lo probamos con meses que el sistema no conocía. De cada 100 obras que marcó en el 20 % de mayor riesgo en Arequipa, <b>${num(100 * p20, 1)}</b> se atrasaron;
              eligiéndolas al azar habrían sido <b>${num(100 * aqp.prevalencia, 1)}</b>. Avisó con una mediana de <b>${num(an.dias_anticipacion_mediana, 0)} días</b> de anticipación
              en el ${pct(an.pct_alertadas / 100)} de las obras que luego se atrasaron.</p></div>
          <div class="clave"><h3>Qué no hace</h3>
            <p>No acusa ni sanciona a nadie: indica qué obras conviene revisar primero y muestra la prueba escrita. Solo ve lo que se anota en el cuaderno;
              una consulta respondida por carta aparece como «sin respuesta en el cuaderno».</p></div>
        </div>`, "Para cualquier persona: ciudadanos, autoridades, supervisores y estudiantes.")}
      <div class="separador-especialistas" role="presentation"><h2 class="solo-lector">Para especialistas</h2>
        <p><b>Para especialistas.</b> Desde aquí, el detalle técnico: fórmulas, métricas, validación y fuentes, para auditores, ingenieros y docentes.</p></div>
      ${seccion("formulas", "Fórmulas", S.formulas(mod), "Todo lo que muestra la ficha de una obra sale de estas fórmulas.")}
      ${seccion("ejemplo", "Ejemplo resuelto", S.ejemplo(mod, primera))}
      ${seccion("resultados", "Qué tan bien acierta", `${segmentado("ambito", "Ámbito de la prueba", [["arequipa", "Arequipa"], ["nacional", "Todo el país"]], "arequipa")}
        <div id="tabla-resultados" aria-live="polite">${S.tablaResultados(mod, "arequipa")}</div>
        <div class="aviso">${icono("info")}<p>El modelo final se eligió por su PR-AUC en validación (${Object.entries(sel).map(([k, v]) => `${k === "M2" ? "Caja Negra" : k} ${num(v, 3)}`).join(", ")}) y la prueba se miró una sola vez.
          En el país supera con significancia a la regla, a la regresión logística y al modelo solo con el cuaderno. En Arequipa (${num(aqp.positivos)} atrasos) solo la ventaja
          frente al azar es concluyente, y el modelo con cuaderno y consultas obtiene una PR-AUC algo mayor.</p></div>`,
        "Prueba de enero a junio de 2026 frente a cinco alternativas más simples. La PR-AUC va de la tasa base (azar) a 1 (perfecto).")}
      ${seccion("niveles", "Niveles y anticipación", S.niveles(mod), "Lo que pasó después con las obras de cada nivel, y con cuánto tiempo avisó el sistema.")}
      ${seccion("pesos", "Qué pesa en el modelo", S.pesos(mod), "Usar un indicador no es lo mismo que aportar: la ablación reentrena el modelo quitando un grupo a la vez.")}
      ${seccion("enlace", "Enlace de consultas con sus respuestas", S.enlaceConsultas(res))}
      ${seccion("indicadores", `Los ${num(mod.catalogo.length)} indicadores`, `
        <div class="herramientas">
          <label class="campo campo-buscar"><span class="solo-lector">Buscar indicador</span>${icono("buscar")}<input id="cat-q" type="search" placeholder="Buscar indicador, fórmula o fuente" autocomplete="off"></label>
          <label class="campo"><span class="solo-lector">Grupo</span><select id="cat-grupo"><option value="">Todos los grupos</option>${grupos.map((g) => `<option>${esc(g)}</option>`).join("")}</select></label>
        </div>
        <div class="tabla-marco" tabindex="0" role="region" aria-label="Catálogo de indicadores"><table class="tabla tabla-catalogo">
          <thead><tr><th scope="col">Qué mide y por qué</th><th scope="col">Fórmula al cierre T</th><th scope="col">Fuente</th><th scope="col" class="der">Cobertura</th><th scope="col" class="der">Peso</th></tr></thead>
          <tbody id="catalogo">${filasCatalogo(mod, "", "")}</tbody></table></div>
        <p class="nota">Cobertura: obras-mes de Arequipa con dato. Peso: ganancia del indicador en el modelo final. Todos usan solo información con fecha menor o igual al cierre T.</p>`,
        "Tres grupos salen del cuaderno de obra y cinco de fuentes oficiales. Un solo catálogo alimenta el modelo, esta web y el informe.")}
      ${seccion("datos", "Datos y límites", S.particion(mod), `Partición temporal estricta: entrenar con el pasado y probar en el futuro. En la prueba de Arequipa, el 20 % de mayor riesgo acertó en ${pct(aqp.modelos["M Caja Negra"].precision_top20, 1)} de los casos.`)}
    </div>
  </div>`;

  conectarSegmentado($("#ambito", main), (v) => {
    $("#tabla-resultados", main).innerHTML = S.tablaResultados(mod, v === "nacional" ? "nacional" : "arequipa");
  });
  const pintarCatalogo = () => {
    $("#catalogo", main).innerHTML = filasCatalogo(mod, /** @type {HTMLSelectElement} */ ($("#cat-grupo", main)).value, /** @type {HTMLInputElement} */ ($("#cat-q", main)).value);
  };
  $("#cat-q", main).addEventListener("input", pintarCatalogo);
  $("#cat-grupo", main).addEventListener("change", pintarCatalogo);

  const enlaces = /** @type {HTMLAnchorElement[]} */ ([...main.querySelectorAll(".indice a")]);
  /** @param {string} id */
  const marcar = (id) => enlaces.forEach((a) => (a.dataset.seccion === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  $(".indice", main).addEventListener("click", (e) => {
    const a = /** @type {HTMLElement} */ (e.target).closest("a[data-seccion]");
    if (!(a instanceof HTMLAnchorElement)) return;
    e.preventDefault();
    const id = a.dataset.seccion ?? "";
    const destino = $(`#${id}`, main);
    destino.scrollIntoView({ block: "start" });
    destino.focus({ preventScroll: true });
    reemplazar(["modelo", id]);
    marcar(id);
  });
  observador?.disconnect();
  observador = new IntersectionObserver((entradas) => {
    const visible = entradas.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (visible) marcar(visible.target.id);
  }, { rootMargin: "-20% 0px -70% 0px" });
  main.querySelectorAll(".seccion-modelo").forEach((s) => observador?.observe(s));
  if (sub && SECCIONES.some(([id]) => id === sub)) requestAnimationFrame(() => { $(`#${sub}`, main).scrollIntoView({ block: "start" }); marcar(sub); });
}
