// @ts-check
// Gráficos sin dependencias: SVG para series temporales y dispersión, HTML para barras (se adaptan al ancho sin
// reescalar el texto). Todo texto que llega aquí se escapa; los valores son los publicados, sin suavizar ni redondear.

import { esc, mesCorto, NIVEL, num, pct } from "./formato.js";

/** @typedef {import("./tipos.js").Nivel} Nivel */
/** @typedef {import("./tipos.js").Aporte} Aporte */

/** @param {number} w @param {number} h @param {string} etiqueta @param {string} cuerpo */
const svg = (w, h, etiqueta, cuerpo) =>
  `<svg class="grafico" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(etiqueta)}">${cuerpo}</svg>`;

/**
 * Probabilidad mes a mes con las franjas de nivel del modelo.
 * @param {{ mes: string, p: number }[]} historia
 * @param {{ alto: number, medio: number }} umbrales
 */
export function lineaRiesgo(historia, umbrales) {
  const W = 640, H = 240, m = { i: 46, d: 20, s: 16, b: 32 };
  const maxY = Math.max(0.1, umbrales.alto * 1.6, ...historia.map((h) => h.p)) * 1.1;
  const ancho = W - m.i - m.d;
  /** @param {number} i */
  const x = (i) => m.i + (historia.length === 1 ? ancho / 2 : (i * ancho) / (historia.length - 1));
  /** @param {number} p */
  const y = (p) => H - m.b - (p / maxY) * (H - m.s - m.b);
  /** @param {number} desde @param {number} hasta @param {string} clase */
  const franja = (desde, hasta, clase) => `<rect class="${clase}" x="${m.i}" y="${y(hasta)}" width="${ancho}" height="${y(desde) - y(hasta)}"/>`;
  const marcas = [0, maxY / 2, maxY].map((p) => `<text class="eje" x="${m.i - 8}" y="${y(p) + 4}" text-anchor="end">${pct(p)}</text>`).join("");
  const paso = Math.ceil(historia.length / 8);
  const meses = historia
    .map((h, i) => (i % paso === 0 || i === historia.length - 1 ? `<text class="eje" x="${x(i)}" y="${H - 10}" text-anchor="middle">${mesCorto(h.mes)}</text>` : ""))
    .join("");
  const trazo = historia.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h.p).toFixed(1)}`).join("");
  const ultimo = historia[historia.length - 1];
  const puntos = historia
    .map((h, i) => `<circle class="punto${i === historia.length - 1 ? " punto-final" : ""}" cx="${x(i)}" cy="${y(h.p)}" r="${i === historia.length - 1 ? 5 : 3}"><title>${mesCorto(h.mes)}: ${pct(h.p, 1)}</title></circle>`)
    .join("");
  const etiquetaFinal = x(historia.length - 1) > W - 90
    ? `<text class="valor" x="${x(historia.length - 1) - 10}" y="${y(ultimo.p) - 12}" text-anchor="end">${pct(ultimo.p, 1)}</text>`
    : `<text class="valor" x="${x(historia.length - 1) + 10}" y="${y(ultimo.p) - 10}">${pct(ultimo.p, 1)}</text>`;
  return svg(W, H, `Evolución del riesgo: ${historia.map((h) => `${mesCorto(h.mes)} ${pct(h.p, 1)}`).join(", ")}`, `
    ${franja(umbrales.alto, maxY, "franja-alto")}${franja(umbrales.medio, umbrales.alto, "franja-medio")}
    <line class="umbral-alto" x1="${m.i}" x2="${W - m.d}" y1="${y(umbrales.alto)}" y2="${y(umbrales.alto)}"/>
    <text class="rotulo-alto" x="${m.i + 8}" y="${y(umbrales.alto) - 7}">Alto desde ${pct(umbrales.alto, 1)}</text>
    <text class="rotulo-medio" x="${m.i + 8}" y="${y(umbrales.medio) - 5}">Medio desde ${pct(umbrales.medio, 1)}</text>
    <line class="eje-base" x1="${m.i}" x2="${W - m.d}" y1="${H - m.b}" y2="${H - m.b}"/>
    ${marcas}${meses}<path class="linea" d="${trazo}"/>${puntos}${etiquetaFinal}`);
}

/**
 * Actividad mensual del cuaderno: asientos, consultas y alertas formales.
 * @param {{ mes: string, asientos: number, consultas: number, alertas: number }[]} meses
 */
export function actividad(meses) {
  const W = 640, H = 210, m = { i: 40, d: 10, s: 18, b: 30 };
  const max = Math.max(1, ...meses.map((x) => x.asientos));
  const ancho = (W - m.i - m.d) / meses.length;
  /** @param {number} v */
  const y = (v) => H - m.b - (v / max) * (H - m.s - m.b);
  const paso = Math.ceil(meses.length / 10);
  const columnas = meses.map((x, i) => {
    const x0 = m.i + i * ancho + ancho * 0.18, w = ancho * 0.64;
    return `<g><title>${mesCorto(x.mes)}: ${x.asientos} asientos, ${x.consultas} consultas, ${x.alertas} alertas formales</title>
      <rect class="barra-asientos" x="${x0}" y="${y(x.asientos)}" width="${w}" height="${H - m.b - y(x.asientos)}" rx="2"/>
      <rect class="barra-consultas" x="${x0}" y="${y(x.consultas)}" width="${w}" height="${H - m.b - y(x.consultas)}" rx="2"/>
      ${x.alertas ? `<circle class="marca-alerta" cx="${x0 + w / 2}" cy="${y(x.asientos) - 8}" r="${Math.min(6, 2.5 + x.alertas)}"/>` : ""}
      ${i % paso === 0 ? `<text class="eje" x="${x0 + w / 2}" y="${H - 10}" text-anchor="middle">${mesCorto(x.mes)}</text>` : ""}</g>`;
  });
  return svg(W, H, `Actividad mensual del cuaderno en ${meses.length} meses; máximo ${max} asientos en un mes`, `
    <text class="eje" x="${m.i - 8}" y="${y(max) + 4}" text-anchor="end">${num(max)}</text>
    <text class="eje" x="${m.i - 8}" y="${H - m.b + 4}" text-anchor="end">0</text>
    <line class="eje-base" x1="${m.i}" x2="${W - m.d}" y1="${H - m.b}" y2="${H - m.b}"/>${columnas.join("")}`);
}

/**
 * Calibración: probabilidad media predicha frente a tasa observada, por decil.
 * @param {{ decil: number, prob_media: number, tasa_observada: number }[]} deciles
 */
export function calibracion(deciles) {
  const W = 380, H = 320, m = 46;
  const max = Math.max(...deciles.map((d) => Math.max(d.prob_media, d.tasa_observada))) * 1.1;
  /** @param {number} v */
  const ex = (v) => m + (v / max) * (W - 2 * m);
  /** @param {number} v */
  const ey = (v) => H - m - (v / max) * (H - 2 * m);
  const puntos = deciles
    .map((d) => `<circle class="punto" cx="${ex(d.prob_media)}" cy="${ey(d.tasa_observada)}" r="5"><title>Decil ${d.decil + 1}: dijo ${pct(d.prob_media, 1)}, ocurrió ${pct(d.tasa_observada, 1)}</title></circle>`)
    .join("");
  return svg(W, H, "Calibración por deciles: cada punto compara la probabilidad dicha con la proporción que se atrasó", `
    <line class="diagonal" x1="${ex(0)}" y1="${ey(0)}" x2="${ex(max)}" y2="${ey(max)}"/>
    <line class="eje-base" x1="${m}" x2="${W - m}" y1="${H - m}" y2="${H - m}"/>
    <line class="eje-base" x1="${m}" x2="${m}" y1="${m}" y2="${H - m}"/>
    <text class="eje" x="${W / 2}" y="${H - 10}" text-anchor="middle">Probabilidad que dijo el modelo</text>
    <text class="eje" x="14" y="${H / 2}" text-anchor="middle" transform="rotate(-90 14 ${H / 2})">Proporción que se atrasó</text>
    <text class="eje" x="${m}" y="${H - m + 18}" text-anchor="middle">0</text>
    <text class="eje" x="${W - m}" y="${H - m + 18}" text-anchor="middle">${pct(max)}</text>
    <text class="eje" x="${m - 8}" y="${m + 4}" text-anchor="end">${pct(max)}</text>${puntos}`);
}

/**
 * Barras horizontales en HTML.
 * @param {{ etiqueta: string, valor: number, clase?: string, nota?: string }[]} items
 * @param {(v: number) => string} formato
 */
export function barras(items, formato) {
  const max = Math.max(...items.map((i) => Math.abs(i.valor))) || 1;
  return `<ul class="barras">${items
    .map((i) => `<li><span class="barras-etiqueta">${esc(i.etiqueta)}${i.nota ? `<small>${esc(i.nota)}</small>` : ""}</span>
      <span class="barras-eje" aria-hidden="true"><i class="${i.clase ?? ""}" style="width:${(100 * Math.abs(i.valor)) / max}%"></i></span>
      <span class="barras-valor num">${formato(i.valor)}</span></li>`)
    .join("")}</ul>`;
}

/**
 * Contribuciones al puntaje (TreeSHAP) centradas en cero: rojo sube el riesgo, verde lo baja.
 * @param {Aporte[]} lista
 */
export function aportes(lista) {
  const max = Math.max(...lista.map((a) => Math.abs(a.peso))) || 1;
  return `<ol class="aportes">${lista
    .map((a) => {
      const w = (50 * Math.abs(a.peso)) / max;
      const sube = a.peso > 0;
      return `<li class="aporte">
        <div class="aporte-texto"><span>${esc(a.frase)}</span>
          <small>${esc(a.grupo)} · ${sube ? "sube" : "baja"} el riesgo en ${num(Math.abs(a.peso), 2)}</small></div>
        <div class="aporte-eje" aria-hidden="true"><i class="${sube ? "sube" : "baja"}" style="${sube ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></i></div>
      </li>`;
    })
    .join("")}</ol>`;
}

/**
 * Barra apilada de obras por nivel, con su conteo escrito (no depende del color).
 * @param {Partial<Record<Nivel, number>>} conteo @param {number} total
 */
export function distribucion(conteo, total) {
  /** @type {Nivel[]} */
  const orden = ["ALTO", "MEDIO", "BAJO"];
  return `<div class="distribucion" role="img" aria-label="${orden.map((k) => `${NIVEL[k].nombre}: ${conteo[k] ?? 0}`).join(", ")}">
    ${orden.map((k) => `<span class="dist-${k}" style="flex-grow:${conteo[k] ?? 0}"><b class="num">${num(conteo[k] ?? 0)}</b> ${NIVEL[k].corto.toLowerCase()}</span>`).join("")}
  </div><p class="solo-lector">${num(total)} obras en total.</p>`;
}
