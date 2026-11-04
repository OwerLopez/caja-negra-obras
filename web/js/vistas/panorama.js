// @ts-check
// Panorama: qué obras revisar primero. Filtros, orden y página viven en la URL (enlace compartible).

import * as D from "../datos.js";
import { distribucion } from "../graficos.js";
import { esc, fecha, millones, NIVEL, NIVELES, num, pct } from "../formato.js";
import { enlace, reemplazar } from "../router.js";
import { $, ayuda, chipNivel, conectarSegmentado, estadoVacio, paginador, segmentado } from "../ui/componentes.js";
import { icono } from "../ui/iconos.js";

/** @typedef {import("../tipos.js").ObraResumen} ObraResumen */
/** @typedef {import("../tipos.js").Nivel} Nivel */
/** @typedef {{ q: string, nivel: string, prov: string, venc: boolean, orden: keyof ObraResumen, dir: "asc" | "desc", pag: number }} Filtros */

const POR_PAGINA = 20;
/** @type {{ clave: keyof ObraResumen, titulo: string, clase?: string }[]} */
const COLUMNAS = [
  { clave: "nombre", titulo: "Obra" },
  { clave: "probabilidad", titulo: "Riesgo a 60 días", clase: "der" },
  { clave: "tendencia", titulo: "Cambio en el mes", clase: "der" },
  { clave: "consultas_vencidas", titulo: "Consultas vencidas", clase: "der" },
  { clave: "razon", titulo: "Lo que más empuja el riesgo" },
];
const ORDENABLES = ["nombre", "probabilidad", "tendencia", "consultas_vencidas"];

/** @param {URLSearchParams} q @returns {Filtros} */
function leerFiltros(q) {
  const orden = /** @type {keyof ObraResumen} */ (ORDENABLES.includes(q.get("orden") ?? "") ? q.get("orden") : "probabilidad");
  return {
    q: q.get("q") ?? "", nivel: NIVELES.includes(/** @type {Nivel} */ (q.get("nivel"))) ? q.get("nivel") ?? "" : "", prov: q.get("prov") ?? "",
    venc: q.get("venc") === "1", orden, dir: q.get("dir") === "asc" ? "asc" : "desc", pag: Math.max(1, Number(q.get("pag")) || 1),
  };
}

/** @param {Filtros} f */
function guardarFiltros(f) {
  /** @type {Record<string, string>} */
  const q = {};
  if (f.q) q.q = f.q;
  if (f.nivel) q.nivel = f.nivel;
  if (f.prov) q.prov = f.prov;
  if (f.venc) q.venc = "1";
  if (f.orden !== "probabilidad" || f.dir !== "desc") { q.orden = String(f.orden); q.dir = f.dir; }
  if (f.pag > 1) q.pag = String(f.pag);
  reemplazar([], q);
}

/** @param {ObraResumen[]} obras @param {Filtros} f */
function aplicar(obras, f) {
  const t = f.q.trim().toLocaleLowerCase("es");
  const lista = obras.filter((o) => (!f.nivel || o.nivel === f.nivel) && (!f.prov || o.provincia === f.prov) && (!f.venc || o.consultas_vencidas > 0)
    && (!t || `${o.nombre} ${o.entidad} ${o.distrito} ${o.provincia}`.toLocaleLowerCase("es").includes(t)));
  const s = f.dir === "asc" ? 1 : -1;
  return lista.sort((a, b) => {
    const x = a[f.orden], y = b[f.orden];
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    return (typeof x === "string" ? x.localeCompare(String(y), "es") : Number(x) - Number(y)) * s;
  });
}

/** @param {number | null} v */
function cambio(v) {
  if (v === null) return '<span class="tenue">Primer mes</span>';
  const p = 100 * v;
  if (Math.abs(p) < 0.5) return '<span class="tenue">Sin cambio</span>';
  return `<span class="${p > 0 ? "sube" : "baja"}">${icono(p > 0 ? "sube" : "baja")}${p > 0 ? "+" : "−"}${num(Math.abs(p))} pts</span>`;
}

/** @param {ObraResumen} o */
const fila = (o) => `<tr>
    <td data-etiqueta="Obra"><a class="obra-enlace" href="${enlace(["obra", o.id])}">${esc(o.nombre)}</a>
      <span class="obra-lugar">${esc(o.entidad)}, ${esc(o.distrito)} (${esc(o.provincia)})</span></td>
    <td data-etiqueta="Riesgo a 60 días" class="der"><span class="prob prob-${o.nivel} num">${pct(o.probabilidad, 1)}</span>${chipNivel(o.nivel, true)}</td>
    <td data-etiqueta="Cambio en el mes" class="der num">${cambio(o.tendencia)}</td>
    <td data-etiqueta="Consultas vencidas" class="der num">${o.consultas_vencidas ? `<b class="vencidas">${num(o.consultas_vencidas)}</b>` : '<span class="tenue">0</span>'}
      ${o.consultas_tarde ? `<span class="obra-lugar">${num(o.consultas_tarde)} ${o.consultas_tarde === 1 ? "respondida" : "respondidas"} tarde</span>` : ""}</td>
    <td data-etiqueta="Lo que más empuja" class="razon">${esc(o.razon) || '<span class="tenue">—</span>'}</td>
  </tr>`;

/**
 * @param {HTMLElement} main
 * @param {URLSearchParams} query
 */
export async function render(main, query) {
  const [obras, res, mod, meta] = await Promise.all([D.obras(), D.resumen(), D.modelo(), D.meta()]);
  document.title = "Panorama · Caja Negra de Obra";
  const f = leerFiltros(query);
  const provincias = [...new Set(obras.map((o) => o.provincia))].sort((a, b) => a.localeCompare(b, "es"));
  const nAqp = Object.fromEntries(mod.niveles.arequipa.map((x) => [x.nivel, x]));
  const conVencidas = obras.filter((o) => o.consultas_vencidas > 0).length;
  const vencidas = obras.reduce((s, o) => s + o.consultas_vencidas, 0);
  const c = res.contraloria;
  /** @param {Nivel} k */
  const contar = (k) => obras.filter((o) => o.nivel === k).length;

  main.innerHTML = `
  <header class="pagina-cabeza">
    <h1>Obras públicas en ejecución en Arequipa</h1>
    <p class="bajada">Qué obras conviene revisar primero, según lo escrito en su cuaderno de obra hasta el ${fecha(meta.corte)}.
      El riesgo es la probabilidad de caer en atraso legal en los próximos ${mod.horizonte_dias} días.</p>
  </header>

  <section class="resumen" aria-labelledby="t-resumen">
    <h2 id="t-resumen" class="solo-lector">Resumen del corte</h2>
    <div class="resumen-principal">
      <p class="resumen-cifra"><b class="num">${num(obras.length)}</b> obras en ejecución, por nivel de riesgo</p>
      ${distribucion(res.por_nivel, obras.length)}
      <dl class="niveles-leyenda">
        ${NIVELES.map((k) => `<div><dt>${chipNivel(k)}</dt><dd>${k === "ALTO" ? `probabilidad desde ${pct(mod.niveles.umbral_alto, 1)}` : k === "MEDIO" ? `desde ${pct(mod.niveles.umbral_medio, 1)}` : `menos de ${pct(mod.niveles.umbral_medio, 1)}`}.
          En la prueba se atrasó el ${pct(nAqp[k].tasa_observada, 1)} de las obras de este nivel.</dd></div>`).join("")}
      </dl>
    </div>
    <div class="resumen-lateral">
      <div class="dato"><span class="dato-icono">${icono("reloj")}</span><p><b class="num">${num(conVencidas)}</b> obras tienen consultas con plazo vencido y sin respuesta en el cuaderno
        <span class="tenue">(${num(vencidas)} consultas en total)</span></p></div>
      <div class="dato"><span class="dato-icono">${icono("alerta")}</span><p><b class="num">${num(c.obras_paralizadas_arequipa)}</b> obras ya estaban paralizadas en Arequipa al 31-03-2026,
        con ${millones(c.costo_actualizado_arequipa)} de costo actualizado <span class="tenue">(Contraloría)</span></p></div>
    </div>
  </section>

  <section class="listado" aria-labelledby="t-listado">
    <div class="listado-cabeza">
      <h2 id="t-listado">Obras ordenadas por riesgo</h2>
      ${ayuda("Cómo leer esta tabla", `<ul>
        <li><b>Riesgo a 60 días:</b> probabilidad calibrada de que la obra anote un atraso legal (valorización menor al 80 % de lo programado o calendario acelerado).</li>
        <li><b>Cambio en el mes:</b> diferencia con la probabilidad del mes anterior, en puntos porcentuales.</li>
        <li><b>Consultas vencidas:</b> consultas del residente que superaron su plazo legal (5 o 21 días) sin respuesta registrada en el cuaderno.</li>
        <li><b>Lo que más empuja el riesgo:</b> el indicador con mayor contribución positiva en el modelo para esa obra.</li></ul>`)}
    </div>
    <form class="herramientas" role="search" id="filtros" aria-label="Filtrar obras">
      <label class="campo campo-buscar"><span class="solo-lector">Buscar por obra, entidad o distrito</span>${icono("buscar")}
        <input id="f-q" type="search" value="${esc(f.q)}" placeholder="Buscar obra, entidad o distrito" autocomplete="off"></label>
      ${segmentado("f-nivel", "Nivel de riesgo", [["", `Todos <span class="cuenta">${num(obras.length)}</span>`], ...NIVELES.map((k) => /** @type {[string, string]} */ ([k, `${NIVEL[k].corto} <span class="cuenta">${num(contar(k))}</span>`]))], f.nivel)}
      <label class="campo"><span class="solo-lector">Provincia</span>
        <select id="f-prov"><option value="">Todas las provincias</option>${provincias.map((p) => `<option ${f.prov === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
      <label class="interruptor"><input id="f-venc" type="checkbox" ${f.venc ? "checked" : ""}><span>Solo con consultas vencidas</span></label>
      <label class="campo campo-orden"><span class="solo-lector">Ordenar por</span>
        <select id="f-orden">${[["probabilidad-desc", "Mayor riesgo primero"], ["tendencia-desc", "Mayor aumento en el mes"], ["consultas_vencidas-desc", "Más consultas vencidas"], ["nombre-asc", "Nombre (A–Z)"]]
          .map(([v, t]) => `<option value="${v}" ${`${String(f.orden)}-${f.dir}` === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    </form>
    <div class="listado-estado"><p id="contador" aria-live="polite"></p><button type="button" class="boton-texto" id="limpiar" hidden>${icono("cerrar")}Quitar filtros</button></div>
    <div id="resultado"></div>
  </section>`;

  const pintar = () => {
    const lista = aplicar(obras, f);
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    f.pag = Math.min(f.pag, paginas);
    const desde = (f.pag - 1) * POR_PAGINA;
    const pagina = lista.slice(desde, desde + POR_PAGINA);
    const filtrado = Boolean(f.q || f.nivel || f.prov || f.venc);
    $("#contador").textContent = lista.length
      ? `Mostrando ${num(desde + 1)}–${num(desde + pagina.length)} de ${num(lista.length)} obras${filtrado ? ` (de ${num(obras.length)} en total)` : ""}`
      : "";
    /** @type {HTMLElement} */ ($("#limpiar")).hidden = !filtrado;
    $("#resultado").innerHTML = lista.length
      ? `<div class="tabla-marco" tabindex="0" role="region" aria-label="Tabla de obras"><table class="tabla-obras">
          <caption class="solo-lector">Obras en ejecución; ordenadas por ${esc(COLUMNAS.find((c2) => c2.clave === f.orden)?.titulo ?? "")}</caption>
          <thead><tr>${COLUMNAS.map((col) => `<th scope="col" class="${col.clase ?? ""}" ${ORDENABLES.includes(String(col.clave)) ? `aria-sort="${col.clave === f.orden ? (f.dir === "asc" ? "ascending" : "descending") : "none"}"` : ""}>
            ${ORDENABLES.includes(String(col.clave)) ? `<button type="button" data-orden="${String(col.clave)}">${col.titulo}${icono("abajo", { clase: "orden-icono" })}</button>` : col.titulo}</th>`).join("")}</tr></thead>
          <tbody>${pagina.map(fila).join("")}</tbody></table></div>${paginador(f.pag, paginas)}`
      : estadoVacio({ titulo: "Ninguna obra coincide con los filtros", texto: "Prueba con otro nombre o quita alguno de los filtros.", accion: { id: "vacio-limpiar", texto: "Quitar filtros" } });
    guardarFiltros(f);
  };

  /** @param {Partial<Filtros>} cambios */
  const actualizar = (cambios) => { Object.assign(f, { pag: 1 }, cambios); pintar(); };
  let espera = 0;
  $("#f-q").addEventListener("input", (e) => {
    clearTimeout(espera);
    espera = window.setTimeout(() => actualizar({ q: /** @type {HTMLInputElement} */ (e.target).value }), 150);
  });
  $("#filtros").addEventListener("submit", (e) => e.preventDefault());
  conectarSegmentado($("#f-nivel"), (v) => actualizar({ nivel: v }));
  $("#f-prov").addEventListener("change", (e) => actualizar({ prov: /** @type {HTMLSelectElement} */ (e.target).value }));
  $("#f-venc").addEventListener("change", (e) => actualizar({ venc: /** @type {HTMLInputElement} */ (e.target).checked }));
  $("#f-orden").addEventListener("change", (e) => {
    const [orden, dir] = /** @type {HTMLSelectElement} */ (e.target).value.split("-");
    actualizar({ orden: /** @type {keyof ObraResumen} */ (orden), dir: dir === "asc" ? "asc" : "desc" });
  });
  const limpiar = () => {
    Object.assign(f, { q: "", nivel: "", prov: "", venc: false, pag: 1 });
    /** @type {HTMLInputElement} */ ($("#f-q")).value = "";
    /** @type {HTMLSelectElement} */ ($("#f-prov")).value = "";
    /** @type {HTMLInputElement} */ ($("#f-venc")).checked = false;
    $("#f-nivel").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.valor === "")));
    pintar();
    /** @type {HTMLInputElement} */ ($("#f-q")).focus();
  };
  $("#limpiar").addEventListener("click", limpiar);
  $("#resultado").addEventListener("click", (e) => {
    const objetivo = /** @type {HTMLElement} */ (e.target);
    const orden = objetivo.closest("button[data-orden]");
    if (orden instanceof HTMLButtonElement) {
      const clave = /** @type {keyof ObraResumen} */ (orden.dataset.orden);
      actualizar({ orden: clave, dir: f.orden === clave ? (f.dir === "asc" ? "desc" : "asc") : clave === "nombre" ? "asc" : "desc" });
      /** @type {HTMLSelectElement} */ ($("#f-orden")).value = `${String(f.orden)}-${f.dir}`;
      $(`button[data-orden="${String(clave)}"]`).focus();
      return;
    }
    const pag = objetivo.closest("button[data-pagina]");
    if (pag instanceof HTMLButtonElement && !pag.disabled) {
      f.pag = Number(pag.dataset.pagina);
      pintar();
      $("#t-listado").scrollIntoView({ block: "start" });
      return;
    }
    if (objetivo.closest("#vacio-limpiar")) limpiar();
  });
  pintar();
}
