"use strict";

const main = document.getElementById("contenido");
const cache = {};
let filtros = { texto: "", nivel: "", provincia: "" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v, d = 0) => `${(100 * v).toLocaleString("es-PE", { maximumFractionDigits: d, minimumFractionDigits: d })} %`;
const num = (v) => Number(v).toLocaleString("es-PE");
const fecha = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
const NIVEL = { ALTO: "Riesgo alto", MEDIO: "Riesgo medio", BAJO: "Riesgo bajo" };
const NIVEL_CORTO = { ALTO: "Alto", MEDIO: "Medio", BAJO: "Bajo" };

async function datos(ruta) {
  if (!cache[ruta]) {
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(`No se pudo leer ${ruta} (${r.status})`);
    cache[ruta] = await r.json();
  }
  return cache[ruta];
}

function marcarNav(nombre) {
  document.querySelectorAll("nav a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.ruta === nombre));
  document.querySelectorAll("nav a[aria-current]").forEach((a) => a.setAttribute("aria-current", "page"));
}

async function enrutar() {
  const h = location.hash.replace(/^#\/?/, "");
  try {
    if (h.startsWith("obra/")) await vistaObra(decodeURIComponent(h.slice(5)));
    else if (h === "metodo") await vistaMetodo();
    else await vistaLista();
  } catch (e) {
    main.innerHTML = `<p class="error">${esc(e.message)}. Recarga la página; si persiste, revisa que la carpeta data/ esté publicada.</p>`;
  }
  main.focus({ preventScroll: true });
}

/* ---------------- lista de obras ---------------- */
async function vistaLista() {
  marcarNav("lista");
  document.title = "Obras en ejecución · Caja Negra de Obra";
  const [obras, res] = await Promise.all([datos("data/obras.json"), datos("data/resumen.json")]);
  const altos = obras.filter((o) => o.nivel === "ALTO").length;
  const sinResp = obras.reduce((s, o) => s + o.consultas_vencidas, 0);
  const conSinResp = obras.filter((o) => o.consultas_vencidas > 0).length;
  const provincias = [...new Set(obras.map((o) => o.provincia))].sort();
  main.innerHTML = `
    <h1 class="titular">${num(obras.length)} obras públicas en ejecución en Arequipa. Conviene revisar primero <span class="cifra-alta">${num(altos)}</span>.</h1>
    <p class="bajada">El sistema leyó su cuaderno de obra hasta el ${fecha(res.corte)}: calcula el riesgo de que caigan en atraso legal en los próximos 60 días y muestra qué consultas del residente siguen sin respuesta.</p>
    <ul class="cifras">
      <li><b>${num(altos)}</b>con riesgo alto</li>
      <li><b>${num(conSinResp)}</b>obras con consultas vencidas sin respuesta en el cuaderno</li>
      <li><b>${num(sinResp)}</b>consultas en esa situación</li>
    </ul>
    <form class="filtros" role="search" id="filtros">
      <label>Buscar obra, entidad o distrito<input id="f-texto" type="search" value="${esc(filtros.texto)}" placeholder="Ej.: Cayma, carretera, colegio"></label>
      <label>Nivel<select id="f-nivel"><option value="">Todos</option>${["ALTO", "MEDIO", "BAJO"].map((n) => `<option value="${n}" ${filtros.nivel === n ? "selected" : ""}>${NIVEL[n]}</option>`).join("")}</select></label>
      <label>Provincia<select id="f-prov"><option value="">Todas</option>${provincias.map((p) => `<option ${filtros.provincia === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
      <span class="contador" id="contador" aria-live="polite"></span>
    </form>
    <ol class="renglones" id="renglones"></ol>`;
  const pintar = () => {
    const t = filtros.texto.trim().toLowerCase();
    const vis = obras.filter((o) => (!filtros.nivel || o.nivel === filtros.nivel) && (!filtros.provincia || o.provincia === filtros.provincia) &&
      (!t || `${o.nombre} ${o.entidad} ${o.distrito} ${o.provincia}`.toLowerCase().includes(t)));
    document.getElementById("contador").textContent = `${num(vis.length)} de ${num(obras.length)} obras, ordenadas por riesgo`;
    document.getElementById("renglones").innerHTML = vis.length ? vis.map((o) => `
      <li class="renglon"><a href="#/obra/${encodeURIComponent(o.id)}">
        <span class="margen"><span class="prob">${pct(o.probabilidad)}</span><span class="nivel nivel-${o.nivel}">${NIVEL_CORTO[o.nivel]}</span></span>
        <span class="nombre">${esc(o.nombre)}</span>
        <span class="pendientes"><b>${num(o.consultas_vencidas)}</b>consultas sin respuesta</span>
        <span class="detalle">${esc(o.entidad)} · ${esc(o.distrito)}, ${esc(o.provincia)}${o.razon ? ` — ${esc(o.razon)}` : ""}</span>
      </a></li>`).join("") : `<li class="vacio">Ninguna obra coincide con la búsqueda. Prueba con otra palabra o quita un filtro.</li>`;
  };
  document.getElementById("filtros").addEventListener("submit", (e) => e.preventDefault());
  document.getElementById("f-texto").addEventListener("input", (e) => { filtros.texto = e.target.value; pintar(); });
  document.getElementById("f-nivel").addEventListener("change", (e) => { filtros.nivel = e.target.value; pintar(); });
  document.getElementById("f-prov").addEventListener("change", (e) => { filtros.provincia = e.target.value; pintar(); });
  pintar();
}

/* ---------------- ficha de obra ---------------- */
function hoja(a, rotulo) {
  return `<figure class="asiento">
    <span class="sello" aria-label="Asiento número ${a.nro}">Asiento<b>${a.nro}</b></span>
    <figcaption>${esc(rotulo)}</figcaption>
    <blockquote>${a.titulo ? `<strong>${esc(a.titulo)}.</strong> ` : ""}${esc(a.texto) || "<em>El asiento no tiene descripción.</em>"}</blockquote>
  </figure>`;
}

function estadoCorto(c) {
  if (c.estado === "Sin respuesta en el cuaderno") return { cls: "Sin", txt: "Sin respuesta en el cuaderno", det: `${c.dias} días esperando · plazo ${c.plazo}` };
  if (c.estado === "Tarde") return { cls: "Tarde", txt: "Respondida tarde", det: `${c.dias} días · plazo ${c.plazo}` };
  if (c.estado === "En plazo") return { cls: "En", txt: "Aún en plazo", det: `${c.dias} de ${c.plazo} días` };
  return { cls: "A", txt: "Respondida a tiempo", det: `${c.dias} días · plazo ${c.plazo}` };
}

function grafico(meses) {
  if (!meses.length) return "";
  const W = 720, H = 150, pad = 26, n = meses.length, bw = Math.max(4, Math.min(28, (W - pad * 2) / n - 4));
  const max = Math.max(...meses.map((m) => m.asientos), 1);
  const x = (i) => pad + i * ((W - pad * 2) / n) + 2;
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const barras = meses.map((m, i) => `
    <rect x="${x(i)}" y="${y(m.asientos)}" width="${bw}" height="${H - pad - y(m.asientos)}" fill="var(--renglon)"><title>${m.mes}: ${m.asientos} anotaciones</title></rect>
    ${m.consultas ? `<rect x="${x(i)}" y="${y(m.consultas)}" width="${bw}" height="${H - pad - y(m.consultas)}" fill="var(--sello)"><title>${m.mes}: ${m.consultas} consultas</title></rect>` : ""}
    ${m.alertas ? `<circle cx="${x(i) + bw / 2}" cy="${pad - 10}" r="${Math.min(4 + m.alertas, 9)}" fill="var(--alto)"><title>${m.mes}: ${m.alertas} suspensiones, ampliaciones, riesgos o penalidades</title></circle>` : ""}`).join("");
  const etq = meses.map((m, i) => (i % Math.ceil(n / 8) === 0 ? `<text x="${x(i)}" y="${H - 6}" font-size="11" fill="var(--tinta-suave)">${m.mes}</text>` : "")).join("");
  return `<svg class="actividad" viewBox="0 0 ${W} ${H}" role="img" aria-label="Anotaciones por mes en el cuaderno de obra">
    <line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" stroke="var(--linea)"/>${barras}${etq}</svg>`;
}

async function vistaObra(id) {
  marcarNav("");
  const [o, res] = await Promise.all([datos(`data/obra/${encodeURIComponent(id)}.json`), datos("data/resumen.json")]);
  document.title = `${o.nombre.slice(0, 60)} · Caja Negra de Obra`;
  const r = o.riesgo, cr = o.consultas_resumen;
  const tasaBase = res.evaluacion.prevalencia;
  const lectura = {
    ALTO: `Está entre las obras con más riesgo. En la prueba con meses que el modelo no vio, ${pct(r.tasa_observada_nivel)} de las obras en este nivel cayeron en atraso legal dentro de 60 días (el promedio es ${pct(tasaBase, 1)}).`,
    MEDIO: `Riesgo intermedio: vale la pena seguirla. En la prueba, ${pct(r.tasa_observada_nivel)} de las obras en este nivel cayeron en atraso legal en 60 días (promedio ${pct(tasaBase, 1)}).`,
    BAJO: `Por ahora no muestra señales fuertes. En la prueba, solo ${pct(r.tasa_observada_nivel, 1)} de las obras en este nivel cayeron en atraso legal en 60 días.`,
  }[r.nivel];
  const pendientes = o.consultas.filter((c) => c.estado !== "A tiempo");
  const ordenadas = [...pendientes.sort((a, b) => b.dias - a.dias), ...o.consultas.filter((c) => c.estado === "A tiempo")];
  const visibles = 8;
  main.innerHTML = `
    <a class="volver" href="#/">Volver a la lista</a>
    <h1 class="ficha-titulo">${esc(o.nombre)}</h1>
    <dl class="ficha-datos">
      <div><dt>Entidad</dt><dd>${esc(o.entidad)}</dd></div>
      <div><dt>Contratista</dt><dd>${esc(o.contratista)}</dd></div>
      <div><dt>Ubicación</dt><dd>${esc(o.distrito)}, ${esc(o.provincia)}</dd></div>
      <div><dt>Cuaderno leído</dt><dd>${fecha(o.primer_asiento)} a ${fecha(o.ultimo_asiento)}</dd></div>
    </dl>

    <section class="pregunta" aria-labelledby="q1">
      <h2 id="q1">¿Se va a atrasar?</h2>
      <p class="ayuda">Probabilidad de que aparezca en el cuaderno el primer atraso legal (avance real menor al 80 % de lo programado o calendario acelerado) en los próximos 60 días.</p>
      <div class="medidor">
        <span class="grande">${pct(r.probabilidad)}</span>
        <div><div class="barra-riesgo"><i style="left:calc(${Math.min(r.probabilidad / 0.3, 1) * 100}% - 2px)"></i></div></div>
        <span><span class="nivel nivel-${r.nivel}">${NIVEL[r.nivel]}</span></span>
        <div class="escala"><span>0 %</span><span>15 %</span><span>30 % o más</span></div>
        <p class="lectura">${lectura}</p>
      </div>
      <div class="razones">
        <div><h3>Lo que más sube el riesgo</h3><ul>${r.razones.map((x) => `<li>${esc(x.frase)}</li>`).join("") || "<li>Ninguna señal destaca.</li>"}</ul></div>
        <div><h3>Lo que lo baja</h3><ul>${r.a_favor.map((x) => `<li>${esc(x.frase)}</li>`).join("") || "<li>Ninguna señal destaca.</li>"}</ul></div>
      </div>
    </section>

    <section class="pregunta" aria-labelledby="q2">
      <h2 id="q2">¿Quién la está trabando?</h2>
      <p class="ayuda">Cada consulta del residente tiene un plazo legal de respuesta: ${res.plazos.directo} días si responde el supervisor y ${res.plazos.con_proyectista} si interviene la entidad y el proyectista (días calendario). Si la respuesta se dio por carta, no aparece en el cuaderno.</p>
      <ul class="estados">
        <li class="e-sin"><b>${cr["Sin respuesta en el cuaderno"]}</b>sin respuesta en el cuaderno</li>
        <li class="e-tarde"><b>${cr["Tarde"]}</b>respondidas tarde</li>
        <li class="e-ok"><b>${cr["A tiempo"]}</b>respondidas a tiempo</li>
        <li><b>${cr["En plazo"]}</b>aún en plazo</li>
      </ul>
      ${o.consultas.length ? `<ol class="consultas" id="consultas">${ordenadas.map((c, i) => {
        const e = estadoCorto(c);
        return `<li class="consulta"${i >= visibles ? " hidden" : ""}>
          <button type="button" aria-expanded="false">
            <span class="c-titulo">${esc(c.titulo || "Consulta sin título")}</span>
            <span class="c-estado est-${e.cls}"><b>${e.txt}</b>${e.det}</span>
            <span class="c-meta">Consulta del ${fecha(c.fecha)} · le toca responder: ${esc(c.responsable)}</span>
          </button>
          <div class="prueba">
            ${hoja(c, `Consulta del residente · ${fecha(c.fecha)}`)}
            ${c.respuesta ? hoja({ nro: c.respuesta.nro, titulo: c.respuesta.titulo, texto: c.respuesta.texto },
              `Respuesta · ${fecha(c.respuesta.fecha)} · ${c.respuesta.metodo}${c.respuesta.metodo.includes("IA") ? ` (confianza ${pct(c.respuesta.confianza)})` : ""}`)
              : `<p class="nota">No hay en el cuaderno una respuesta enlazada a esta consulta.</p>`}
          </div>
        </li>`;
      }).join("")}</ol>${ordenadas.length > visibles ? `<p class="mas"><button class="boton" id="ver-mas" type="button">Mostrar las ${ordenadas.length} consultas</button></p>` : ""}`
        : `<p class="nota">El residente no registró consultas en el cuaderno.</p>`}
    </section>

    <section class="pregunta" aria-labelledby="q3">
      <h2 id="q3">¿Qué está pasando?</h2>
      <p class="ayuda">Anotaciones por mes y los hechos formales registrados en el cuaderno, cada uno con su asiento.</p>
      <p class="leyenda"><span style="--c:var(--renglon)">Anotaciones</span><span style="--c:var(--sello)">Consultas</span><span style="--c:var(--alto)">Suspensiones, ampliaciones, riesgos o penalidades</span></p>
      ${grafico(o.meses)}
      ${o.hitos.length ? `<ol class="hitos">${o.hitos.slice(-12).reverse().map((h) => `<li>${hoja(h, `${h.tipo} · ${fecha(h.fecha)} · ${h.rol}`)}</li>`).join("")}</ol>
        ${o.hitos.length > 12 ? `<p class="nota">Se muestran los 12 hechos más recientes de ${o.hitos.length}.</p>` : ""}`
        : `<p class="nota">No hay hechos formales registrados (suspensiones, ampliaciones, adicionales, riesgos o penalidades).</p>`}
    </section>`;
  main.querySelectorAll(".consulta > button").forEach((b) => b.addEventListener("click", () => {
    const li = b.parentElement, abierta = li.classList.toggle("abierta");
    b.setAttribute("aria-expanded", abierta);
  }));
  const mas = document.getElementById("ver-mas");
  if (mas) mas.addEventListener("click", () => { main.querySelectorAll(".consulta[hidden]").forEach((x) => x.removeAttribute("hidden")); mas.remove(); });
  window.scrollTo(0, 0);
}

/* ---------------- cómo funciona ---------------- */
async function vistaMetodo() {
  marcarNav("metodo");
  document.title = "Cómo funciona · Caja Negra de Obra";
  const res = await datos("data/resumen.json");
  const e = res.evaluacion, emp = res.emparejador, q = res.consultas_arequipa, ant = e.anticipacion;
  const fila = (n, m, dest) => `<tr${dest ? ' class="destacado"' : ""}><td>${n}</td><td class="num">${m.pr_auc.toFixed(3)}</td><td class="num">${m.roc_auc.toFixed(3)}</td><td class="num">${pct(m.precision_top20)}</td><td class="num">${pct(m.recall_top20)}</td></tr>`;
  main.innerHTML = `<article class="metodo">
    <h1>Leemos la caja negra de la obra mientras todavía está viva</h1>
    <p>Cuando un avión cae, se lee su caja negra para saber qué pasó. En una obra pública esa caja negra es el cuaderno de obra: ahí el residente y el supervisor anotan todo. Hoy se lee cuando la obra ya está atrasada. Este prototipo lo lee cada mes para avisar antes.</p>
    <ol class="pasos">
      <li><h3>Leer el cuaderno</h3><p>Se descargan los asientos publicados por el OECE (datos abiertos, junio 2024 a agosto 2026): ${num(res.consultas_arequipa.consultas_residente)} consultas del residente solo en Arequipa.</p></li>
      <li><h3>Unir cada consulta con su respuesta</h3><p>Si la respuesta cita el número de asiento o de consulta, se usa esa cita. Si no, una IA que entiende el texto elige la consulta que se está respondiendo; solo se acepta cuando su confianza es alta. En Arequipa, con el número borrado para la prueba, la IA acierta ${pct(emp.modelo_ia)} de las veces; la regla «la más reciente» acierta ${pct(emp.regla_mas_reciente)}.</p></li>
      <li><h3>Medir los plazos de la ley</h3><p>Cada respuesta se compara con su plazo legal: ${res.plazos.directo} días para el supervisor y ${res.plazos.con_proyectista} cuando interviene la entidad y el proyectista. Mediana en Arequipa: ${q.dias_respuesta.mediana} días; ${q.pct_tarde_entre_respondidas} % de las respuestas llegó tarde.</p></li>
      <li><h3>Estimar el riesgo de atraso</h3><p>Un modelo de aprendizaje automático (LightGBM, calibrado) aprende del pasado qué combinación de señales del cuaderno antecede al atraso legal, y se prueba en meses posteriores que nunca vio.</p></li>
    </ol>
    <h2>¿Funciona? Prueba en Arequipa, enero a junio de 2026</h2>
    <p class="nota">${num(e.particion.prueba.filas)} filas obra-mes en todo el país y ${e.niveles.reduce((s, x) => s + x.filas, 0)} en Arequipa; el ${pct(e.prevalencia, 1)} de las obras-mes de Arequipa cayó en atraso legal dentro de 60 días. PR-AUC es la métrica principal porque el evento es poco frecuente.</p>
    <div class="tabla-envoltura"><table>
      <thead><tr><th>Método</th><th class="num">PR-AUC</th><th class="num">ROC-AUC</th><th class="num">Acierto al revisar el 20 %</th><th class="num">Atrasos encontrados en ese 20 %</th></tr></thead>
      <tbody>
        <tr><td>Revisar al azar</td><td class="num">${e.prevalencia.toFixed(3)}</td><td class="num">0,500</td><td class="num">${pct(e.prevalencia, 1)}</td><td class="num">20 %</td></tr>
        ${fila("Regla: contar consultas vencidas", e.regla)}
        ${fila("Regresión logística", e.logistica)}
        ${fila("Modelo sin las variables de consultas", e.sin_consultas)}
        ${fila("Caja Negra (modelo con consultas)", e.modelo, true)}
      </tbody></table></div>
    <p class="nota">Agregar lo que el sistema mide en las consultas mejora la PR-AUC en ${e.aporte_consultas.diferencia.toFixed(3)} (IC 95 %: ${e.aporte_consultas.ic95[0].toFixed(3)} a ${e.aporte_consultas.ic95[1].toFixed(3)}). De ${ant.obras_con_evento} obras de Arequipa que cayeron en atraso en el periodo de prueba, ${ant.alertadas_antes} (${ant.pct_alertadas} %) tuvieron antes una alerta de riesgo alto, con una mediana de ${ant.dias_anticipacion_mediana} días de anticipación.</p>
    <h2>Lo que no hace</h2>
    <p>No acusa ni sanciona a nadie, no reemplaza al supervisor ni al órgano de control y no ve lo que se comunica fuera del cuaderno (cartas, oficios). Es una lista de prioridades con la prueba a la vista para decidir dónde mirar primero.</p>
  </article>`;
}

window.addEventListener("hashchange", enrutar);
enrutar();
