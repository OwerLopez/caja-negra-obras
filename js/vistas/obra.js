// Ficha de una obra: riesgo y sus razones, indicadores clave, consultas con la prueba escrita y la historia del cuaderno.

import * as D from "../datos.js";
import { actividad, aportes, lineaRiesgo } from "../graficos.js";
import { COLOR_NIVEL, esc, ESTADO, fecha, nivelChip, num, pct } from "../formato.js";

const ORDEN_ESTADO = ["Sin respuesta en el cuaderno", "Tarde", "En plazo", "A tiempo"];
const HITOS_INICIALES = 8;
const CONSULTAS_INICIALES = 10;

const hoja = (a, meta) => `
  <figure class="asiento">
    <div class="sello" aria-hidden="true">ASIENTO<b>${num(a.nro)}</b></div>
    <figcaption>${meta}</figcaption>
    <blockquote>${a.titulo ? `<strong>${esc(a.titulo)}.</strong> ` : ""}${esc(a.texto)}</blockquote>
  </figure>`;

function consulta(c, i, corte) {
  const e = ESTADO[c.estado];
  const espera = c.respuesta
    ? `respondida en ${num(c.dias)} días · plazo ${num(c.plazo)}`
    : `${num(c.dias)} días esperando · plazo ${num(c.plazo)}`;
  const r = c.respuesta;
  return `<li class="consulta" data-estado="${esc(c.estado)}">
    <button type="button" aria-expanded="false" aria-controls="prueba-${i}">
      <span class="c-titulo">${esc(c.titulo || `Consulta del asiento ${c.nro}`)}</span>
      <span class="c-meta">Asiento ${num(c.nro)} · ${fecha(c.fecha)} · debe responder: ${esc(c.responsable)}</span>
      <span class="c-estado est-${e.clase}"><b>${e.corto}</b>${espera}</span>
    </button>
    <div class="prueba" id="prueba-${i}">
      ${hoja(c, `Consulta del residente · ${fecha(c.fecha)}`)}
      ${r
        ? hoja(r, `Respuesta · ${fecha(r.fecha)} · ${esc(r.metodo)}${r.confianza < 1 ? ` (confianza ${pct(r.confianza)})` : ""}`)
        : `<p class="nota">No hay en el cuaderno un asiento que responda esta consulta hasta el ${fecha(corte)}.
           ${c.estado === "Sin respuesta en el cuaderno" ? "Vencido el plazo, el contratista puede solicitar ampliación de plazo (RLCE art. 193; RLGCP art. 190)." : ""}</p>`}
    </div>
  </li>`;
}

function lectura(o, mod) {
  const r = o.riesgo;
  const suben = r.aportes.filter((a) => a.peso > 0).slice(0, 3).map((a) => a.frase.toLowerCase());
  const nivelTxt = { ALTO: "alto", MEDIO: "medio", BAJO: "bajo" }[r.nivel];
  return `La probabilidad estimada de atraso legal en los próximos 60 días es <b>${pct(r.probabilidad, 1)}</b>,
    ${num(r.veces_tasa_base, 1)} veces la tasa base de Arequipa (${pct(mod.resultados.arequipa.prevalencia, 1)}). Nivel ${nivelTxt}:
    en la prueba, el ${pct(r.tasa_observada_nivel, 1)} de las obras-mes de este nivel se atrasó.
    ${suben.length ? `Lo que más empuja el riesgo: ${suben.join("; ")}.` : ""}`;
}

export async function render(main, id) {
  const [o, mod, res] = await Promise.all([D.obra(id), D.modelo(), D.resumen()]);
  document.title = `${o.nombre.slice(0, 60)} · Caja Negra de Obra`;
  const r = o.riesgo;
  const q = o.consultas_resumen;
  const consultas = [...o.consultas].sort(
    (a, b) => ORDEN_ESTADO.indexOf(a.estado) - ORDEN_ESTADO.indexOf(b.estado) || b.dias - a.dias,
  );
  const hitos = [...o.hitos].reverse();

  main.innerHTML = `
  <a class="volver" href="#/">← Todas las obras</a>
  <header class="ficha-cabeza">
    <div>
      <h1 class="ficha-titulo">${esc(o.nombre)}</h1>
      <dl class="ficha-datos">
        <div><dt>Entidad</dt><dd>${esc(o.entidad)}</dd></div>
        <div><dt>Contratista</dt><dd>${esc(o.contratista || "—")}</dd></div>
        <div><dt>Ubicación</dt><dd>${esc(o.distrito)}, ${esc(o.provincia)}</dd></div>
        ${o.cui ? `<div><dt>CUI</dt><dd class="num">${esc(o.cui)}</dd></div>` : ""}
        <div><dt>Cuaderno</dt><dd>${fecha(o.primer_asiento)} – ${fecha(o.ultimo_asiento)}</dd></div>
      </dl>
    </div>
    <div class="riesgo-grande">
      <span class="cifra num" style="color:${COLOR_NIVEL[r.nivel]}">${pct(r.probabilidad, 1)}</span>
      ${nivelChip(r.nivel)}
      <small>probabilidad de atraso legal en 60 días</small>
    </div>
  </header>

  <div class="rejilla dos">
    <section class="panel">
      <h2>Por qué tiene este riesgo</h2>
      <p class="lectura">${lectura(o, mod)}</p>
      ${aportes(r.aportes)}
      <p class="nota">Cada barra es la contribución de un indicador al logit del modelo (TreeSHAP). Rojo sube el riesgo y verde lo baja.
        La suma de todas las contribuciones más la base da el puntaje que se calibra a probabilidad.</p>
    </section>
    <section class="panel">
      <h2>Evolución del riesgo</h2>
      <p class="ayuda">Probabilidad calculada al cierre de cada mes, solo con lo que estaba escrito hasta esa fecha.</p>
      ${lineaRiesgo(r.historia, { alto: mod.niveles.umbral_alto, medio: mod.niveles.umbral_medio })}
    </section>
  </div>

  <section class="panel">
    <h2>Indicadores clave</h2>
    <p class="ayuda">Plazo frente a avance, dinero que llega, historial de los actores y temporada. «Sin dato» significa que la fuente no lo registra para esta obra.</p>
    <div class="indicadores">${o.indicadores
      .map((x) => `<div class="indicador ${x.frase ? "" : "vacio"}"><span class="grupo">${esc(x.grupo)}</span>
        <p>${x.frase ? esc(x.frase) : "Sin dato en la fuente"}</p></div>`)
      .join("")}</div>
  </section>

  <section class="panel">
    <h2>Consultas del residente: quién está trabando</h2>
    <p class="ayuda">Plazo legal: 5 días si responde el supervisor o inspector; 21 días si la consulta requiere a la entidad y al proyectista (días calendario).
      Abre una consulta para ver la prueba escrita.</p>
    <ul class="estados">
      <li class="e-sin"><b class="num">${num(q["Sin respuesta en el cuaderno"])}</b>vencidas sin respuesta</li>
      <li class="e-tarde"><b class="num">${num(q.Tarde)}</b>respondidas tarde</li>
      <li><b class="num">${num(q["En plazo"])}</b>esperando, en plazo</li>
      <li class="e-ok"><b class="num">${num(q["A tiempo"])}</b>respondidas a tiempo</li>
    </ul>
    <div class="conmutador" role="group" aria-label="Filtrar consultas">
      <button type="button" data-filtro="" aria-pressed="true">Todas (${num(consultas.length)})</button>
      ${ORDEN_ESTADO.map((e) => `<button type="button" data-filtro="${esc(e)}" aria-pressed="false">${ESTADO[e].corto}</button>`).join("")}
    </div>
    ${consultas.length ? `<ul class="consultas" id="consultas">${consultas.map((c, i) => consulta(c, i, res.corte)).join("")}</ul>` : `<p class="nota">Esta obra no registra consultas del residente.</p>`}
    ${consultas.length > CONSULTAS_INICIALES ? `<button type="button" class="boton" id="mas-consultas">Ver las ${num(consultas.length)} consultas</button>` : ""}
  </section>

  <section class="panel">
    <h2>Historia del cuaderno</h2>
    <div class="leyenda"><span style="--c:var(--sello)">Asientos</span><span style="--c:var(--medio)">Consultas</span><span style="--c:var(--alto)">Suspensión, ampliación, riesgo o penalidad</span></div>
    ${actividad(o.meses)}
    ${hitos.length ? "" : `<p class="nota">El cuaderno no registra hitos formales (inicio del plazo, suspensión, ampliación, adicional, penalidad, riesgo…).</p>`}
    <ol class="hitos" id="hitos">${hitos
      .map((h, i) => `<li ${i >= HITOS_INICIALES ? "hidden" : ""}>${hoja(h, `${esc(h.tipo)} · ${esc(h.rol)} · ${fecha(h.fecha)}`)}</li>`)
      .join("")}</ol>
    ${hitos.length > HITOS_INICIALES ? `<button type="button" class="boton" id="mas-hitos">Ver los ${num(hitos.length)} hitos</button>` : ""}
  </section>`;

  const lista = document.getElementById("consultas");
  let filtro = "", todas = false;
  const mostrar = () => {
    let visibles = 0;
    lista?.querySelectorAll(".consulta").forEach((li) => {
      const coincide = !filtro || li.dataset.estado === filtro;
      li.hidden = !coincide || (!todas && visibles >= CONSULTAS_INICIALES);
      if (coincide) visibles += 1;
    });
  };
  mostrar();
  lista?.addEventListener("click", (e) => {
    const b = e.target.closest(".consulta > button");
    if (!b) return;
    const abierta = b.parentElement.classList.toggle("abierta");
    b.setAttribute("aria-expanded", String(abierta));
  });
  main.querySelector(".conmutador")?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filtro]");
    if (!b) return;
    main.querySelectorAll(".conmutador button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    filtro = b.dataset.filtro;
    mostrar();
  });
  document.getElementById("mas-consultas")?.addEventListener("click", (e) => {
    todas = true;
    mostrar();
    e.currentTarget.remove();
  });
  document.getElementById("mas-hitos")?.addEventListener("click", (e) => {
    document.querySelectorAll("#hitos li[hidden]").forEach((li) => { li.hidden = false; });
    e.currentTarget.remove();
  });
}
