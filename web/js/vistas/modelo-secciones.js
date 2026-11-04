// @ts-check
// Contenido de «Cómo funciona». Cada función arma una sección con los valores publicados en modelo.json y resumen.json.

import { barras, calibracion } from "../graficos.js";
import { esc, fecha, NIVELES, num, pct } from "../formato.js";
import { chipNivel } from "../ui/componentes.js";
import { termino } from "../ui/glosario.js";

/** @typedef {import("../tipos.js").Modelo} Modelo */
/** @typedef {import("../tipos.js").Resumen} Resumen */
/** @typedef {import("../tipos.js").Ficha} Ficha */

export const NOMBRE_MODELO = {
  "B0 Tasa base": "Revisar al azar (tasa base)",
  "B1 Regla: consultas vencidas": "Regla: más consultas vencidas primero",
  "B2 Regresión logística": "Regresión logística",
  "B3 LightGBM solo cuaderno": "Árboles solo con el cuaderno",
  "M1 LightGBM cuaderno + consultas": "Árboles con cuaderno y consultas",
  "M Caja Negra": "Caja Negra (8 grupos de indicadores)",
};
/** @param {string} k */
const nombreModelo = (k) => /** @type {Record<string, string>} */ (NOMBRE_MODELO)[k] ?? k;
/** @param {number} v */
const signo = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v), 3)}`;

/** @param {Modelo} mod */
export const pasos = (mod) => `<ol class="pasos">
    <li><h3>Leer</h3><p>Cada mes se toman los asientos del cuaderno de obra (OECE) y se cruzan con el contrato, el SIAF y el INFOBRAS de la obra.</p></li>
    <li><h3>Enlazar</h3><p>Cada consulta del residente se une con su respuesta: por reglas si la respuesta cita el número, o leyendo el texto con IA.</p></li>
    <li><h3>Medir plazos</h3><p>Se cuentan los días de cada consulta frente a su plazo legal (5 o 21 días) y se identifica quién debe responder.</p></li>
    <li><h3>Predecir y explicar</h3><p>${mod.catalogo.length} indicadores entran a un modelo de árboles que da una probabilidad, un nivel y las razones de cada obra.</p></li>
  </ol>`;

/** @param {Modelo} mod */
export function formulas(mod) {
  const n = mod.niveles, h = mod.hiperparametros;
  /** @type {[string, [string, string, string][]][]} */
  const grupos = [
    ["Del cuaderno a la probabilidad", [
      ["Qué se predice", `y(obra, T) = 1 si en (T, T + ${mod.horizonte_dias} días] se anota\n«valorización < 80 %» o «calendario acelerado»`,
        "Son los dos supuestos de atraso que la norma obliga a registrar (RLCE art. 203; Ley 32069). T es el cierre de cada mes."],
      ["Puntaje", `F(x) = Σₖ fₖ(x),   k = 1 … ${mod.arboles}`,
        `Suma de ${mod.arboles} árboles LightGBM de ${h.num_leaves} hojas (tasa ${num(h.learning_rate, 2)}, al menos ${h.min_data_in_leaf} obras-mes por hoja). La parada temprana fija cuántos árboles.`],
      ["Aprendizaje", "L = − Σᵢ [ yᵢ ln pᵢ + (1 − yᵢ) ln(1 − pᵢ) ]\npᵢ = σ(F(xᵢ)) = 1 / (1 + e^−F(xᵢ))",
        "Cada árbol nuevo corrige el error de los anteriores, solo con obras-mes de entrenamiento."],
      ["Razones", "F(x) = φ₀ + Σⱼ φⱼ(x)",
        `TreeSHAP reparte el puntaje entre los ${mod.catalogo.length} indicadores. φⱼ > 0 sube el riesgo; φ₀ = ${num(mod.base_logit, 3)} es la base común.`],
      ["Probabilidad", `p = 1 / (1 + e^−(A·F(x) + B))\nA = ${num(mod.platt.A, 3)},  B = ${num(mod.platt.B, 3)}`,
        "Calibración de Platt ajustada en validación: un 10 % significa que de cada 10 obras parecidas, 1 se atrasa."],
      ["Nivel", `Alto si p ≥ ${pct(n.umbral_alto, 2)}\nMedio si p ≥ ${pct(n.umbral_medio, 2)}`,
        "El 20 % superior y el 30 % siguiente de la validación. Se fijan antes de mirar la prueba."],
    ]],
    ["Cómo se mide si acierta", [
      ["PR-AUC (métrica principal)", "AP = Σₙ (Rₙ − Rₙ₋₁) · Pₙ",
        "Promedio de la precisión P a lo largo del ranking. Se usa porque solo entre el 4 % y el 7 % de las obras-mes se atrasa."],
      ["Métricas para el supervisor", "Precisión@20 = TP₂₀ / N₂₀\nLift@20 = Precisión@20 / tasa base\nBrier = (1/N) Σ (pᵢ − yᵢ)²",
        "Si reviso solo el 20 % marcado, ¿cuántas aciertan y cuántas veces mejor que al azar? Brier mide si la probabilidad es creíble."],
      ["Incertidumbre", "IC 95 % = percentiles 2,5 y 97,5\nde 1 000 remuestreos por obra",
        "Se sortean obras completas, porque los meses de una misma obra no son independientes."],
    ]],
    ["Consultas y plazos", [
      ["Plazo de cada consulta", "d = min(fecha de respuesta, T) − fecha de consulta\nvencida si d > 5 (supervisor) o d > 21 (con proyectista)",
        "Días calendario, según RLCE art. 193 y RLGCP art. 190."],
      ["Enlace consulta → respuesta", "sim(u, v) = u · v / (‖u‖ ‖v‖)",
        "Si la respuesta no cita la consulta, se compara el significado de los textos (Sentence-BERT) y un clasificador de pares elige la más probable."],
    ]],
  ];
  return grupos.map(([titulo, cajas]) => `<h3 class="subtitulo">${esc(titulo)}</h3><div class="formulas">${cajas
    .map(([t, f, p]) => `<div class="formula"><h4>${esc(t)}</h4><pre>${esc(f)}</pre><p>${esc(p)}</p></div>`).join("")}</div>`).join("");
}

/** @param {Modelo} mod @param {Ficha} o */
export function ejemplo(mod, o) {
  const r = o.riesgo;
  const F = (Math.log(r.probabilidad / (1 - r.probabilidad)) - mod.platt.B) / mod.platt.A;
  const resto = F - mod.base_logit - r.aportes.reduce((s, a) => s + a.peso, 0);
  return `<p class="panel-bajada">La obra con mayor riesgo del corte, <a href="#/obra/${esc(o.id)}">${esc(o.nombre)}</a>. Su puntaje se descompone exactamente
      en lo que aporta cada indicador; luego la calibración lo convierte en probabilidad.</p>
    <div class="tabla-marco" tabindex="0" role="region" aria-label="Tabla del ejemplo resuelto"><table class="tabla">
      <thead><tr><th scope="col">Término</th><th scope="col">Qué dice el cuaderno y las fuentes</th><th scope="col" class="der">Aporte (logit)</th></tr></thead>
      <tbody>
        <tr><td>φ₀</td><td>Base común del modelo</td><td class="der num">${signo(mod.base_logit)}</td></tr>
        ${r.aportes.map((a) => `<tr><td><code>${esc(a.variable)}</code></td><td>${esc(a.frase)}</td><td class="der num ${a.peso > 0 ? "sube" : "baja"}">${signo(a.peso)}</td></tr>`).join("")}
        <tr><td>Resto</td><td>Los otros ${mod.catalogo.length - r.aportes.length} indicadores sumados</td><td class="der num">${signo(resto)}</td></tr>
        <tr class="fila-total"><td>F(x)</td><td>Puntaje total</td><td class="der num">${signo(F)}</td></tr>
        <tr class="fila-total"><td>p</td><td>1 / (1 + e^−(${num(mod.platt.A, 3)} × (${num(F, 3)}) + ${num(mod.platt.B, 3)}))</td><td class="der num">${pct(r.probabilidad, 1)}</td></tr>
      </tbody></table></div>
    <p class="nota">Nivel ${chipNivel(r.nivel)}: supera el umbral de ${pct(mod.niveles.umbral_alto, 2)}.</p>`;
}

/** @param {Modelo} mod @param {"arequipa" | "nacional"} ambito */
export function tablaResultados(mod, ambito) {
  const R = mod.resultados[ambito];
  const ic = (/** @type {[number, number] | undefined} */ v) => (v ? `<small class="tenue">${num(v[0], 3)}–${num(v[1], 3)}</small>` : "");
  const p = (/** @type {number} */ v) => (v < 0.001 ? "< 0,001" : num(v, 3));
  return `<p class="panel-bajada">${ambito === "arequipa" ? "Arequipa" : "Todo el país"}: ${num(R.filas)} obras-mes de ${num(R.obras)} obras, con ${num(R.positivos)} atrasos
      (tasa base ${pct(R.prevalencia, 1)}). Precisión@20: de cada 100 obras marcadas en el 20 % de mayor riesgo, cuántas se atrasaron.</p>
    <div class="tabla-marco" tabindex="0" role="region" aria-label="Tabla de resultados por método"><table class="tabla">
      <thead><tr><th scope="col">Método</th><th scope="col" class="der">${termino("PR-AUC", "prauc")} <small>(IC 95 %)</small></th><th scope="col" class="der">${termino("Precisión@20", "precision20")}</th>
        <th scope="col" class="der">${termino("Lift@20", "lift")}</th><th scope="col" class="der">${termino("ROC-AUC", "roc")}</th><th scope="col" class="der">${termino("Brier", "brier")}</th><th scope="col" class="der">¿Caja Negra es mejor? <small>(${termino("p", "p")})</small></th></tr></thead>
      <tbody>${Object.entries(R.modelos).map(([k, m]) => {
        const c = R.comparacion_pareada[k];
        return `<tr class="${k === "M Caja Negra" ? "fila-destacada" : ""}"><th scope="row">${esc(nombreModelo(k))}</th>
          <td class="der num">${num(m.pr_auc, 3)} ${k === "B0 Tasa base" ? "" : ic(m.pr_auc_ic95)}</td><td class="der num">${pct(m.precision_top20, 1)}</td>
          <td class="der num">${num(m.lift_top20, 2)}×</td><td class="der num">${num(m.roc_auc, 3)}</td><td class="der num">${m.brier === undefined ? "—" : num(m.brier, 4)}</td>
          <td class="der num">${c ? `${signo(c.diferencia_pr_auc)} <small class="tenue">(p ${p(c.p_unilateral)})</small>` : "—"}</td></tr>`;
      }).join("")}</tbody></table></div>`;
}

/** @param {Modelo} mod */
export function niveles(mod) {
  const an = mod.anticipacion.arequipa;
  return `<div class="rejilla-2">
    <div>
      <div class="tabla-marco" tabindex="0" role="region" aria-label="Tabla de niveles de riesgo"><table class="tabla">
        <thead><tr><th scope="col">Nivel</th><th scope="col" class="der">Obras-mes</th><th scope="col" class="der">Se atrasaron</th><th scope="col" class="der">Proporción</th><th scope="col" class="der">El modelo dijo</th></tr></thead>
        <tbody>${NIVELES.map((k) => mod.niveles.arequipa.find((x) => x.nivel === k)).filter((x) => x !== undefined).map((x) => `<tr><th scope="row">${chipNivel(x.nivel, true)}</th>
          <td class="der num">${num(x.filas)}</td><td class="der num">${num(x.eventos)}</td><td class="der num">${pct(x.tasa_observada, 1)}</td><td class="der num">${pct(x.prob_media, 1)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="nota">Prueba de Arequipa, enero a junio de 2026. «El modelo dijo» es la probabilidad media que asignó a ese grupo.</p>
      <dl class="cifras">
        <div><dt>Obras atrasadas que antes tuvieron alerta alta</dt><dd><b class="num">${pct(an.pct_alertadas / 100, 1)}</b> <span class="tenue">(${num(an.alertadas_antes)} de ${num(an.obras_con_evento)})</span></dd></div>
        <div><dt>Anticipación mediana</dt><dd><b class="num">${num(an.dias_anticipacion_mediana, 1)} días</b> <span class="tenue">(la mitad entre ${num(an.dias_anticipacion_p25_p75[0], 0)} y ${num(an.dias_anticipacion_p25_p75[1], 0)})</span></dd></div>
      </dl>
    </div>
    <figure class="figura">
      ${calibracion(mod.calibracion_nacional)}
      <figcaption>Calibración en la prueba nacional. Cada punto es un décimo de las obras-mes ordenadas por probabilidad; sobre la diagonal, lo dicho coincide con lo ocurrido.</figcaption>
    </figure>
  </div>`;
}

/** @param {Modelo} mod */
export function pesos(mod) {
  const grupos = Object.entries(mod.importancia_grupo).sort((a, b) => b[1] - a[1]);
  const abl = mod.ablacion.por_grupo;
  return `<div class="rejilla-2">
    <div>
      <h3 class="subtitulo">Cuánto usa el modelo cada grupo</h3>
      ${barras(grupos.map(([g, v]) => ({ etiqueta: mod.grupos[g], valor: v })), (v) => pct(v / 100, 1))}
      <p class="nota">Porcentaje de la ganancia de los árboles atribuida a cada grupo.</p>
    </div>
    <div>
      <h3 class="subtitulo">Qué se pierde al quitar cada grupo</h3>
      <div class="tabla-marco" tabindex="0" role="region" aria-label="Tabla de ablación por grupo"><table class="tabla tabla-compacta">
        <thead><tr><th scope="col">Grupo quitado</th><th scope="col" class="der">Validación</th><th scope="col" class="der">Arequipa</th><th scope="col" class="der">País</th></tr></thead>
        <tbody>${grupos.map(([g]) => `<tr><th scope="row">${esc(mod.grupos[g])}</th>${(/** @type {const} */ (["validacion", "arequipa", "nacional"]))
          .map((k) => `<td class="der num ${abl[g][k].caida > 0 ? "baja" : "sube"}">${signo(abl[g][k].caida)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
      <p class="nota">Caída de la PR-AUC al reentrenar sin el grupo. Positivo: el grupo ayuda. Negativo: sin él se obtuvo igual o más en esa muestra; con
        ${num(mod.resultados.arequipa.positivos)} atrasos en Arequipa, esas diferencias están dentro de la variación por muestreo.</p>
    </div>
  </div>`;
}

/** @param {Resumen} res */
export function enlaceConsultas(res) {
  const e = res.emparejador;
  return `<p class="panel-bajada">Se evaluó con ${num(e.respuestas)} respuestas de Arequipa que citan su consulta: se borró el número citado y el sistema tuvo que
      adivinarla entre ${num(e.candidatos_promedio, 1)} candidatas en promedio.</p>
    ${barras([
      { etiqueta: "Elegir al azar", valor: e.azar, clase: "gris" },
      { etiqueta: "Solo similitud de texto", valor: e.solo_similitud_texto, clase: "gris" },
      { etiqueta: "Regla: la consulta más reciente", valor: e.regla_mas_reciente, clase: "gris" },
      { etiqueta: "IA: Sentence-BERT y clasificador de pares", valor: e.modelo_ia },
    ], (v) => pct(v, 1))}
    <p class="nota">Acierto de la IA: ${pct(e.modelo_ia, 1)} (IC 95 %: ${pct(e.modelo_ia_ic95[0], 1)} a ${pct(e.modelo_ia_ic95[1], 1)}). En la web solo se acepta un enlace de IA
      con confianza de al menos ${num(e.umbral, 2)}: precisión de ${pct(e.precision_con_umbral, 1)} con cobertura de ${pct(e.cobertura_con_umbral, 1)}. El resto queda como «sin respuesta en el cuaderno».</p>`;
}

/** @param {Modelo} mod */
export function particion(mod) {
  const p = mod.particion;
  /** @type {[keyof Modelo["particion"], string, string][]} */
  const filas = [["entrenamiento", "Entrenamiento", "Aprender los árboles"], ["validacion", "Validación", "Parada temprana, calibración, umbrales y elección del modelo"], ["prueba", "Prueba", "Medición final, una sola vez"]];
  return `<div class="tabla-marco" tabindex="0" role="region" aria-label="Tabla de partición temporal"><table class="tabla">
      <thead><tr><th scope="col">Bloque</th><th scope="col">Cierres de mes</th><th scope="col" class="der">Obras-mes</th><th scope="col" class="der">Obras</th><th scope="col" class="der">Con atraso</th><th scope="col">Uso</th></tr></thead>
      <tbody>${filas.map(([k, t, uso]) => `<tr><th scope="row">${t}</th><td>${fecha(p[k].desde)} a ${fecha(p[k].hasta)}</td><td class="der num">${num(p[k].filas)}</td>
        <td class="der num">${num(p[k].obras)}</td><td class="der num">${num(p[k].positivos)}</td><td>${uso}</td></tr>`).join("")}</tbody>
    </table></div>
    <ul class="limites">
      <li>Predice el atraso legal (avance menor al 80 % de lo programado), no la paralización.</li>
      <li>Solo cubre obras por contrata con cuaderno digital, desde junio de 2024.</li>
      <li>Una consulta «sin respuesta en el cuaderno» pudo responderse por carta: el sistema solo ve el cuaderno.</li>
      <li>Prioriza la revisión; no acusa ni sanciona. Toda alerta se verifica con el expediente.</li>
    </ul>`;
}
