// Panorama: todas las obras de Arequipa en ejecución, ordenadas por riesgo, con filtros y orden por columna.

import * as D from "../datos.js";
import { COLOR_NIVEL, esc, fecha, millones, NIVEL, nivelChip, num, pct, puntos } from "../formato.js";

const estado = { texto: "", nivel: "", provincia: "", orden: "probabilidad", asc: false };

const COLUMNAS = [
  { clave: "nombre", titulo: "Obra" },
  { clave: "probabilidad", titulo: "Riesgo a 60 días", clase: "derecha" },
  { clave: "tendencia", titulo: "Cambio vs. mes anterior", clase: "derecha col-opcional" },
  { clave: "consultas_vencidas", titulo: "Consultas sin respuesta", clase: "derecha" },
  { clave: "razon", titulo: "Lo que más pesa", clase: "col-opcional", sinOrden: true },
];

function filtrar(obras) {
  const t = estado.texto.trim().toLowerCase();
  const lista = obras.filter(
    (o) =>
      (!estado.nivel || o.nivel === estado.nivel) &&
      (!estado.provincia || o.provincia === estado.provincia) &&
      (!t || `${o.nombre} ${o.entidad} ${o.distrito} ${o.provincia}`.toLowerCase().includes(t)),
  );
  const k = estado.orden, s = estado.asc ? 1 : -1;
  return lista.sort((a, b) => {
    const x = a[k] ?? -Infinity, y = b[k] ?? -Infinity;
    return (typeof x === "string" ? x.localeCompare(y, "es") : x - y) * s;
  });
}

function fila(o) {
  return `<tr data-id="${esc(o.id)}">
    <td><div class="obra-nombre"><a href="#/obra/${esc(o.id)}">${esc(o.nombre)}</a></div>
      <div class="obra-detalle">${esc(o.entidad)} · ${esc(o.distrito)}, ${esc(o.provincia)}</div></td>
    <td class="derecha"><span class="prob num" style="color:${COLOR_NIVEL[o.nivel]}">${pct(o.probabilidad, 1)}</span>
      <div class="barrita"><i style="width:${Math.min(100, 100 * o.probabilidad / 0.5)}%;background:${COLOR_NIVEL[o.nivel]}"></i></div>
      ${nivelChip(o.nivel)}</td>
    <td class="derecha col-opcional num">${puntos(o.tendencia)}</td>
    <td class="derecha num">${o.consultas_vencidas ? `<b class="prob" style="color:var(--medio)">${num(o.consultas_vencidas)}</b>` : `<span class="nota">0</span>`}
      ${o.consultas_tarde ? `<div class="obra-detalle">${num(o.consultas_tarde)} respondidas tarde</div>` : ""}</td>
    <td class="col-opcional"><span class="nota">${esc(o.razon)}</span></td>
  </tr>`;
}

function pintarTabla(obras) {
  const lista = filtrar(obras);
  document.getElementById("cuerpo").innerHTML = lista.length
    ? lista.map(fila).join("")
    : `<tr><td colspan="5" class="nota">Ninguna obra coincide con los filtros.</td></tr>`;
  document.getElementById("contador").textContent = `${num(lista.length)} de ${num(obras.length)} obras`;
  document.querySelectorAll(".tabla-obras th[data-clave]").forEach((th) => {
    if (th.dataset.clave === estado.orden) th.setAttribute("aria-sort", estado.asc ? "ascending" : "descending");
    else th.removeAttribute("aria-sort");
  });
}

export async function render(main) {
  const [obras, res, mod] = await Promise.all([D.obras(), D.resumen(), D.modelo()]);
  const alto = mod.niveles.arequipa.find((x) => x.nivel === "ALTO");
  document.title = "Panorama · Caja Negra de Obra";
  const n = res.por_nivel;
  const conSin = obras.filter((o) => o.consultas_vencidas > 0).length;
  const sinResp = obras.reduce((s, o) => s + o.consultas_vencidas, 0);
  const c = res.contraloria;
  const q = res.consultas_arequipa;
  const provincias = [...new Set(obras.map((o) => o.provincia))].sort();

  main.innerHTML = `
  <section class="portada">
    <div>
      <p class="antetitulo">Inspector virtual del cuaderno de obra · corte ${fecha(res.corte)}</p>
      <h1 class="titular">${num(obras.length)} obras públicas en ejecución en Arequipa. <em>${num(n.ALTO ?? 0)}</em> conviene revisarlas ya.</h1>
      <p class="bajada">El sistema lee cada asiento del cuaderno de obra digital, enlaza cada consulta del residente con su respuesta,
        controla los plazos legales para responder y estima la probabilidad de caer en atraso legal en los próximos 60 días.
        Cada alerta muestra el asiento que la respalda.</p>
    </div>
    <aside class="contexto" aria-label="Contexto oficial">
      <p><b>${num(c.obras_paralizadas_arequipa)} obras paralizadas</b>en Arequipa al 31-03-2026, con ${millones(c.costo_actualizado_arequipa)} de costo actualizado (tercer departamento del país).</p>
      <p><b>${num(q.veredicto["Sin respuesta en el cuaderno"])} de ${num(q.consultas_residente)}</b>consultas del residente en Arequipa no tienen respuesta registrada en el cuaderno; la mediana de respuesta es ${num(q.dias_respuesta.mediana)} días.</p>
      <p class="nota">Fuentes: ${esc(c.fuente)}; ${esc(res.fuente)}.</p>
    </aside>
  </section>

  <ul class="cifras">
    <li class="c-alto"><b class="num">${num(n.ALTO ?? 0)}</b>obras en riesgo alto</li>
    <li class="c-medio"><b class="num">${num(n.MEDIO ?? 0)}</b>en riesgo medio</li>
    <li><b class="num">${num(conSin)}</b>obras con consultas vencidas sin respuesta</li>
    <li><b class="num">${num(sinResp)}</b>consultas en esa situación</li>
  </ul>
  <div class="distribucion" role="img" aria-label="Distribución por nivel: ${["ALTO", "MEDIO", "BAJO"].map((k) => `${NIVEL[k]} ${n[k] ?? 0}`).join(", ")}">
    ${["ALTO", "MEDIO", "BAJO"].map((k) => `<span style="width:${(100 * (n[k] ?? 0)) / obras.length}%;background:${COLOR_NIVEL[k]}"></span>`).join("")}
  </div>
  <p class="nota">Riesgo alto: el 20 % de obras-mes con mayor puntaje en validación. En la prueba de Arequipa, el ${pct(alto.tasa_observada, 1)} de las obras-mes en ese nivel cayó en atraso legal en 60 días, frente a una tasa base del ${pct(mod.resultados.arequipa.prevalencia, 1)}.</p>

  <form class="filtros" role="search" id="filtros">
    <label>Buscar obra, entidad o distrito<input id="f-texto" type="search" value="${esc(estado.texto)}" placeholder="Ej.: Cayma, carretera, colegio" autocomplete="off"></label>
    <label>Nivel<select id="f-nivel"><option value="">Todos</option>${["ALTO", "MEDIO", "BAJO"].map((k) => `<option value="${k}" ${estado.nivel === k ? "selected" : ""}>${NIVEL[k]}</option>`).join("")}</select></label>
    <label>Provincia<select id="f-prov"><option value="">Todas</option>${provincias.map((p) => `<option ${estado.provincia === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
    <span class="contador" id="contador" aria-live="polite"></span>
  </form>
  <div class="envoltura">
    <table class="tabla-obras">
      <caption class="solo-lector">Obras en ejecución ordenadas por riesgo de atraso legal</caption>
      <thead><tr>${COLUMNAS.map((c) => `<th scope="col" class="${c.clase ?? ""}" ${c.sinOrden ? "" : `data-clave="${c.clave}"`}>${c.sinOrden ? c.titulo : `<button type="button">${c.titulo}</button>`}</th>`).join("")}</tr></thead>
      <tbody id="cuerpo"></tbody>
    </table>
  </div>`;

  pintarTabla(obras);
  const f = document.getElementById("filtros");
  f.addEventListener("submit", (e) => e.preventDefault());
  f.addEventListener("input", () => {
    estado.texto = document.getElementById("f-texto").value;
    estado.nivel = document.getElementById("f-nivel").value;
    estado.provincia = document.getElementById("f-prov").value;
    pintarTabla(obras);
  });
  main.querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-clave]");
    if (!th) return;
    estado.asc = estado.orden === th.dataset.clave ? !estado.asc : th.dataset.clave === "nombre";
    estado.orden = th.dataset.clave;
    pintarTabla(obras);
  });
  document.getElementById("cuerpo").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr && !e.target.closest("a")) location.hash = `#/obra/${tr.dataset.id}`;
  });
}
