// «Cómo predice»: etiqueta, fórmulas, indicadores, validación y límites, todo leído de data/modelo.json.

import * as D from "../datos.js";
import { barras, calibracion } from "../graficos.js";
import { esc, fecha, num, pct } from "../formato.js";

const FINAL = "M Caja Negra";
let ambito = "arequipa";
let grupoCatalogo = "";

const ic = (v) => (v ? `<span class="nota">[${num(v[0], 3)} – ${num(v[1], 3)}]</span>` : "");
const sig = (v) => (v == null ? "—" : v < 0.001 ? "< 0.001" : num(v, 3));

function tablaMetricas(mod) {
  const r = mod.resultados[ambito];
  const par = r.comparacion_pareada;
  const filas = Object.entries(r.modelos)
    .map(([nombre, m]) => `<tr class="${nombre === FINAL ? "destacado" : ""}">
      <td>${esc(nombre)}</td>
      <td class="num">${num(m.pr_auc, 3)} ${ic(m.pr_auc_ic95)}</td>
      <td class="num">${num(m.roc_auc, 3)}</td>
      <td class="num">${pct(m.precision_top20, 1)}</td>
      <td class="num">${pct(m.recall_top20, 1)}</td>
      <td class="num">${num(m.lift_top20, 2)}×</td>
      <td class="num">${m.brier == null ? "—" : num(m.brier, 4)}</td>
      <td class="num">${par[nombre] ? `${par[nombre].diferencia_pr_auc > 0 ? "+" : ""}${num(par[nombre].diferencia_pr_auc, 3)} (p ${sig(par[nombre].p_unilateral)})` : "—"}</td>
    </tr>`)
    .join("");
  return `<p class="nota">${ambito === "arequipa" ? "Prueba en Arequipa" : "Prueba nacional"}: ${num(r.filas)} obras-mes de ${num(r.obras)} obras, ${num(r.positivos)} con atraso legal (tasa base ${pct(r.prevalencia, 1)}).</p>
  <div class="envoltura"><table class="tabla">
    <thead><tr><th>Modelo</th><th>PR-AUC [IC 95 %]</th><th>ROC-AUC</th><th>Precisión@20 %</th><th>Recall@20 %</th><th>Lift@20 %</th><th>Brier</th><th>M − modelo (p)</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`;
}

function tablaCatalogo(mod) {
  const filas = mod.catalogo
    .filter((c) => !grupoCatalogo || c.grupo === grupoCatalogo)
    .map((c) => `<tr><td><code>${esc(c.variable)}</code><br><span class="etiqueta-grupo">${esc(c.grupo)}</span></td>
      <td class="formula">${esc(c.formula)}</td><td>${esc(c.fuente)}</td><td>${esc(c.por_que)}</td>
      <td class="num derecha">${num(c.cobertura_arequipa, 0)} %</td><td class="num derecha">${num(c.importancia, 1)} %</td></tr>`)
    .join("");
  return `<div class="envoltura"><table class="tabla">
    <thead><tr><th>Indicador</th><th>Fórmula (corte T)</th><th>Fuente</th><th>Por qué explica un atraso</th><th class="derecha">Cobertura AQP</th><th class="derecha">Importancia</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`;
}

const conmutador = (id, opciones, actual) => `<div class="conmutador" role="group" id="${id}">${opciones
  .map(([v, t]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === actual}">${esc(t)}</button>`)
  .join("")}</div>`;

function formulas(mod) {
  const n = mod.niveles, h = mod.hiperparametros;
  const cajas = [
    ["1 · Qué se predice", `y(obra, T) = 1  si en (T, T + ${mod.horizonte_dias} días] se anota\n  «valorización < 80 % de lo programado» o «calendario acelerado»`,
      "Son los dos supuestos de atraso que la norma obliga a registrar (RLCE art. 203; Ley 32069 y su reglamento). T es el fin de cada mes."],
    ["2 · Puntaje del modelo", `F(x) = Σₖ fₖ(x),   k = 1 … ${mod.arboles}`,
      `Suma de ${mod.arboles} árboles de decisión (LightGBM, ${h.num_leaves} hojas, tasa ${h.learning_rate}, ≥ ${h.min_data_in_leaf} obras-mes por hoja, L2 = ${h.lambda_l2}). El número de árboles lo fija la parada temprana en validación.`],
    ["3 · Aprendizaje", "L = − Σᵢ [ yᵢ · ln σ(F(xᵢ)) + (1 − yᵢ) · ln(1 − σ(F(xᵢ))) ]\nσ(z) = 1 / (1 + e⁻ᶻ)",
      "Cada árbol nuevo corrige el error (log-loss) de los anteriores. Solo se usan obras-mes de entrenamiento."],
    ["4 · Explicación por indicador", "F(x) = φ₀ + Σⱼ φⱼ(x)",
      `TreeSHAP reparte el puntaje exacto entre los ${mod.catalogo.length} indicadores: φⱼ > 0 sube el riesgo. φ₀ = ${num(mod.base_logit, 3)} es la base común.`],
    ["5 · Probabilidad calibrada", `p = 1 / (1 + e^−(A · F(x) + B))\nA = ${num(mod.platt.A, 3)},  B = ${num(mod.platt.B, 3)}`,
      "Escalado de Platt ajustado en validación, para que un 10 % signifique que de cada 10 obras parecidas, 1 se atrasa."],
    ["6 · Nivel de alerta", `ALTO  si p ≥ ${pct(n.umbral_alto, 2)}  (20 % superior en validación)\nMEDIO si p ≥ ${pct(n.umbral_medio, 2)}  (siguiente 30 %)\nBAJO  en otro caso`,
      "Los cortes se fijan antes de mirar la prueba; así la cantidad de alertas es manejable para una oficina de control."],
    ["7 · PR-AUC (métrica principal)", "AP = Σₙ (Rₙ − Rₙ₋₁) · Pₙ",
      "Promedio de la precisión P a lo largo de todo el ranking (R = recall). Se elige porque solo entre el 4 % y el 7 % de las obras-mes se atrasa: el ROC-AUC luce bien aunque el modelo falle en los pocos casos que importan."],
    ["8 · Métricas operativas", "Precisión@20 % = atrasos en el 20 % superior ÷ obras-mes del 20 %\nLift@20 % = Precisión@20 % ÷ tasa base\nBrier = (1/N) Σ (pᵢ − yᵢ)²",
      "Responden a la pregunta del supervisor: si reviso solo las obras marcadas, ¿cuántas aciertan? Brier mide si la probabilidad está bien calibrada."],
    ["9 · Incertidumbre", "IC 95 % = percentiles 2,5 y 97,5 de 1 000 remuestreos por obra\np = P(Δ PR-AUC ≤ 0) en bootstrap pareado",
      "Se remuestrea por obra (no por fila) porque los meses de una misma obra no son independientes."],
    ["10 · Plazo de cada consulta", "días = (fecha de respuesta o de corte) − fecha de la consulta\nvencida si días > 5 (supervisor) o > 21 (entidad + proyectista)",
      "RLCE art. 193 y RLGCP art. 190: días calendario. Si no hay respuesta y venció, el contratista puede pedir ampliación de plazo."],
    ["11 · Enlace consulta → respuesta", "sim(u, v) = u · v / (‖u‖ ‖v‖)\nscore = LightGBM(sim, Δdías, rol, citas, …)",
      "Primero reglas (la respuesta cita el número de asiento o de consulta); si no, embeddings multilingües de los dos textos y un clasificador de pares."],
  ];
  return `<div class="formulas">${cajas
    .map(([t, f, p]) => `<div class="formula-caja"><h3>${esc(t)}</h3><code>${esc(f)}</code><p>${esc(p)}</p></div>`)
    .join("")}</div>`;
}

async function ejemplo(mod) {
  const obras = await D.obras();
  const o = await D.obra(obras[0].id);
  const r = o.riesgo;
  const logit = Math.log(r.probabilidad / (1 - r.probabilidad));
  const F = (logit - mod.platt.B) / mod.platt.A;
  const suma = r.aportes.reduce((s, a) => s + a.peso, 0);
  const resto = F - mod.base_logit - suma;
  return `<div class="envoltura"><table class="tabla">
    <thead><tr><th>Término</th><th>Indicador leído del cuaderno y las fuentes</th><th class="derecha">φ (logit)</th></tr></thead>
    <tbody>
      <tr><td>φ₀</td><td>Base común del modelo</td><td class="num derecha">${num(mod.base_logit, 3)}</td></tr>
      ${r.aportes.map((a) => `<tr><td><code>${esc(a.variable)}</code></td><td>${esc(a.frase)}</td><td class="num derecha ${a.peso > 0 ? "subir" : "bajar"}">${a.peso > 0 ? "+" : ""}${num(a.peso, 3)}</td></tr>`).join("")}
      <tr><td>Resto</td><td>Los otros ${mod.catalogo.length - r.aportes.length} indicadores sumados</td><td class="num derecha">${resto > 0 ? "+" : ""}${num(resto, 3)}</td></tr>
      <tr class="destacado"><td>F(x)</td><td>Puntaje total</td><td class="num derecha">${num(F, 3)}</td></tr>
      <tr class="destacado"><td>p</td><td>1 / (1 + e^−(${num(mod.platt.A, 3)} × ${F < 0 ? `(${num(F, 3)})` : num(F, 3)} + ${num(mod.platt.B, 3)}))</td><td class="num derecha">${pct(r.probabilidad, 1)}</td></tr>
    </tbody></table></div>
    <p class="nota">Obra: <a href="#/obra/${esc(o.id)}">${esc(o.nombre)}</a>. Nivel ${esc(r.nivel)}: supera el umbral de ${pct(mod.niveles.umbral_alto, 2)}.</p>`;
}

export async function render(main) {
  const [mod, res] = await Promise.all([D.modelo(), D.resumen()]);
  document.title = "Cómo predice · Caja Negra de Obra";
  const p = mod.particion, an = mod.anticipacion.arequipa, an2 = mod.anticipacion.nacional, e = res.emparejador;
  const grupos = Object.entries(mod.importancia_grupo).sort((a, b) => b[1] - a[1]);
  const nombreGrupo = mod.grupos;
  const abl = mod.ablacion.por_grupo;

  main.innerHTML = `
  <header class="metodo-cabeza">
    <p class="antetitulo">Ficha técnica del modelo</p>
    <h1>Cómo lee el cuaderno y cómo calcula el riesgo</h1>
    <p>Cada fin de mes T se toma una «foto» de cada obra usando solo lo escrito y registrado hasta ese día. Con ${mod.catalogo.length} indicadores en
      ${Object.keys(nombreGrupo).length} grupos, un modelo de árboles estima la probabilidad de que en los ${mod.horizonte_dias} días siguientes aparezca un atraso legal.
      Se entrenó con obras de todo el Perú y se evaluó en meses futuros que el modelo nunca vio.</p>
  </header>

  <ol class="pasos">
    <li><h3>Leer</h3><p>Se descargan los asientos del cuaderno de obra digital (OECE) y se cruzan con contrato, SIAF e INFOBRAS por obra.</p></li>
    <li><h3>Enlazar</h3><p>Cada consulta del residente se une a su respuesta por reglas y, si no cita el número, por lectura del texto con IA.</p></li>
    <li><h3>Medir plazos</h3><p>Se cuentan los días de cada consulta frente al plazo legal de 5 o 21 días y se identifica quién debe responder.</p></li>
    <li><h3>Predecir y explicar</h3><p>${mod.catalogo.length} indicadores → probabilidad calibrada → nivel, con las razones de cada obra y el asiento que lo prueba.</p></li>
  </ol>

  <section class="panel">
    <h2>Fórmulas: de los asientos a la probabilidad</h2>
    <p class="ayuda">Todo lo que se ve en la ficha de una obra sale de estas once fórmulas.</p>
    ${formulas(mod)}
  </section>

  <section class="panel">
    <h2>Ejemplo resuelto con la obra de mayor riesgo</h2>
    <p class="ayuda">El puntaje se descompone exactamente en la contribución de cada indicador; luego Platt lo convierte en probabilidad.</p>
    <div id="ejemplo"><p class="nota">Calculando…</p></div>
  </section>

  <section class="panel">
    <h2>Resultados en la prueba (enero–junio de 2026)</h2>
    <p class="ayuda">El modelo final (M Caja Negra, 8 grupos) se eligió por PR-AUC en validación: ${Object.entries(mod.seleccion.pr_auc_validacion).map(([k, v]) => `${esc(k)} ${num(v, 3)}`).join(" · ")}.
      La prueba se miró una sola vez. Se comparan reglas y modelos más simples.</p>
    ${conmutador("ambito", [["arequipa", "Arequipa"], ["nacional", "Nacional"]], ambito)}
    <div id="metricas">${tablaMetricas(mod)}</div>
    <p class="nota">Lectura honesta: a nivel nacional el modelo de 8 grupos supera con significancia a la tasa base, a la regla, a la regresión logística y al modelo solo-cuaderno;
      en Arequipa (${num(mod.resultados.arequipa.positivos)} atrasos) solo la diferencia frente a la tasa base es concluyente, y el modelo M1 obtiene un PR-AUC numéricamente mayor.</p>
  </section>

  <div class="rejilla dos">
    <section class="panel">
      <h2>Qué pesa más</h2>
      <p class="ayuda">Importancia por ganancia (gain) de los árboles, sumada por grupo.</p>
      ${barras(grupos.map(([g, v]) => ({ etiqueta: nombreGrupo[g], valor: v })), { formato: (v) => `${num(v, 1)} %` })}
    </section>
    <section class="panel">
      <h2>Ablación: qué se pierde al quitar cada grupo</h2>
      <p class="ayuda">Caída del PR-AUC al reentrenar sin el grupo. Positivo: el grupo ayuda. Negativo: en esa muestra el modelo rindió igual o mejor sin él; con 51 atrasos en Arequipa esas diferencias están dentro del ruido.</p>
      <div class="envoltura"><table class="tabla">
        <thead><tr><th>Grupo quitado</th><th class="derecha">Validación</th><th class="derecha">Arequipa</th><th class="derecha">Nacional</th></tr></thead>
        <tbody>${grupos.map(([g]) => `<tr><td>${esc(nombreGrupo[g])}</td>${["validacion", "arequipa", "nacional"]
          .map((k) => `<td class="num derecha ${abl[g][k].caida > 0 ? "bajar" : "subir"}">${abl[g][k].caida > 0 ? "+" : ""}${num(abl[g][k].caida, 4)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </section>
  </div>

  <div class="rejilla dos">
    <section class="panel">
      <h2>Niveles y lo que ocurrió después</h2>
      <div class="envoltura"><table class="tabla">
        <thead><tr><th>Nivel (Arequipa)</th><th class="derecha">Obras-mes</th><th class="derecha">Con atraso</th><th class="derecha">Tasa observada</th><th class="derecha">Prob. media</th></tr></thead>
        <tbody>${["ALTO", "MEDIO", "BAJO"].map((k) => mod.niveles.arequipa.find((x) => x.nivel === k)).map((x) => `<tr><td><span class="nivel nivel-${x.nivel}">${x.nivel}</span></td>
          <td class="num derecha">${num(x.filas)}</td><td class="num derecha">${num(x.eventos)}</td><td class="num derecha">${pct(x.tasa_observada, 1)}</td><td class="num derecha">${pct(x.prob_media, 1)}</td></tr>`).join("")}</tbody>
      </table></div>
      <ul class="cifras cifras-2">
        <li><b class="num">${pct(an.pct_alertadas / 100, 1)}</b>de las ${num(an.obras_con_evento)} obras de Arequipa que se atrasaron fueron marcadas ALTO en algún cierre de mes dentro de los 120 días previos al atraso</li>
        <li><b class="num">${num(an.dias_anticipacion_mediana, 1)} días</b>de anticipación mediana (p25–p75: ${num(an.dias_anticipacion_p25_p75[0], 0)}–${num(an.dias_anticipacion_p25_p75[1], 0)}); nacional ${num(an2.dias_anticipacion_mediana, 0)} días</li>
      </ul>
    </section>
    <section class="panel">
      <h2>Calibración (prueba nacional)</h2>
      <p class="ayuda">Cada punto es un decil de probabilidad; sobre la diagonal, lo predicho coincide con lo observado.</p>
      ${calibracion(mod.calibracion_nacional)}
    </section>
  </div>

  <section class="panel">
    <h2>Enlace consulta → respuesta</h2>
    <p class="ayuda">Evaluado con ${num(e.respuestas)} respuestas que citan su asiento (se ocultó el número antes de predecir); en promedio hay ${num(e.candidatos_promedio, 1)} consultas candidatas por respuesta.</p>
    ${barras([
      { etiqueta: "Azar", valor: e.azar, color: "var(--tenue)" },
      { etiqueta: "Solo similitud de texto", valor: e.solo_similitud_texto, color: "var(--tenue)" },
      { etiqueta: "Regla: la consulta más reciente", valor: e.regla_mas_reciente, color: "var(--tenue)" },
      { etiqueta: "IA: embeddings + LightGBM de pares", valor: e.modelo_ia },
    ], { formato: (v) => pct(v, 1) })}
    <p class="nota">Exactitud del modelo IA: ${pct(e.modelo_ia, 1)} [IC 95 % ${pct(e.modelo_ia_ic95[0], 1)} – ${pct(e.modelo_ia_ic95[1], 1)}]. En el prototipo solo se acepta un enlace de IA con confianza ≥ ${num(e.umbral, 2)}:
      precisión ${pct(e.precision_con_umbral, 1)} con cobertura ${pct(e.cobertura_con_umbral, 1)}; el resto queda como «sin respuesta en el cuaderno».</p>
  </section>

  <section class="panel">
    <h2>Catálogo de los ${mod.catalogo.length} indicadores</h2>
    <p class="ayuda">Todos usan solo información con fecha ≤ T. Cobertura: % de obras-mes de Arequipa con dato. Importancia: % de la ganancia total del modelo.</p>
    ${conmutador("grupo", [["", "Todos"], ...Object.values(nombreGrupo).map((g) => [g, g])], grupoCatalogo)}
    <div id="catalogo">${tablaCatalogo(mod)}</div>
  </section>

  <section class="panel">
    <h2>Partición temporal</h2>
    <div class="envoltura"><table class="tabla">
      <thead><tr><th>Bloque</th><th>Cortes T</th><th class="derecha">Obras-mes</th><th class="derecha">Obras</th><th class="derecha">Con atraso</th><th>Uso</th></tr></thead>
      <tbody>${[["entrenamiento", "Aprender los árboles"], ["validacion", "Parada temprana, Platt, umbrales y elección del modelo"], ["prueba", "Medición final, una sola vez"]]
        .map(([k, uso]) => `<tr><td>${k[0].toUpperCase() + k.slice(1).replace("cion", "ción")}</td><td>${fecha(p[k].desde)} – ${fecha(p[k].hasta)}</td>
          <td class="num derecha">${num(p[k].filas)}</td><td class="num derecha">${num(p[k].obras)}</td><td class="num derecha">${num(p[k].positivos)}</td><td>${uso}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="nota">Límites: el cuaderno registra lo que las partes deciden escribir; una consulta «sin respuesta en el cuaderno» pudo responderse por otro medio.
      El sistema prioriza la revisión; no acusa ni sanciona.</p>
  </section>`;

  main.querySelector("#ambito").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    ambito = b.dataset.v;
    ev.currentTarget.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    main.querySelector("#metricas").innerHTML = tablaMetricas(mod);
  });
  main.querySelector("#grupo").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    grupoCatalogo = b.dataset.v;
    ev.currentTarget.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    main.querySelector("#catalogo").innerHTML = tablaCatalogo(mod);
  });
  main.querySelector("#ejemplo").innerHTML = await ejemplo(mod);
}
