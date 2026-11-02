// Gráficos en SVG y HTML sin dependencias. Todos los textos que llegan aquí ya vienen escapados o son números.

import { esc, mesCorto, num, pct } from "./formato.js";

const svg = (w, h, etiqueta, cuerpo) =>
  `<svg class="grafico" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(etiqueta)}">${cuerpo}</svg>`;

// Evolución mensual de la probabilidad, con las franjas de nivel del modelo.
export function lineaRiesgo(historia, umbrales) {
  const W = 620, H = 220, m = { i: 44, d: 16, s: 14, b: 30 };
  const maxY = Math.max(0.1, umbrales.alto * 1.6, ...historia.map((h) => h.p)) * 1.08;
  const x = (i) => m.i + (historia.length === 1 ? (W - m.i - m.d) / 2 : (i * (W - m.i - m.d)) / (historia.length - 1));
  const y = (p) => H - m.b - (p / maxY) * (H - m.s - m.b);
  const franja = (desde, hasta, color) =>
    `<rect x="${m.i}" y="${y(hasta)}" width="${W - m.i - m.d}" height="${y(desde) - y(hasta)}" fill="${color}"/>`;
  const marcas = [0, maxY / 2, maxY].map(
    (p) => `<text x="${m.i - 6}" y="${y(p) + 4}" text-anchor="end">${pct(p)}</text>`,
  );
  const paso = Math.ceil(historia.length / 8);
  const etiquetas = historia
    .map((h, i) => (i % paso === 0 || i === historia.length - 1 ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${mesCorto(h.mes)}</text>` : ""))
    .join("");
  const trazo = historia.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h.p).toFixed(1)}`).join("");
  const ultimo = historia.at(-1);
  const puntos = historia
    .map((h, i) => `<circle cx="${x(i)}" cy="${y(h.p)}" r="${i === historia.length - 1 ? 5 : 3}" fill="var(--texto)"><title>${mesCorto(h.mes)}: ${pct(h.p, 1)}</title></circle>`)
    .join("");
  return svg(W, H, `Evolución del riesgo: ${pct(ultimo.p, 1)} en ${mesCorto(ultimo.mes)}`, `
    ${franja(umbrales.alto, maxY, "var(--alto-fondo)")}
    ${franja(umbrales.medio, umbrales.alto, "var(--medio-fondo)")}
    <line x1="${m.i}" x2="${W - m.d}" y1="${y(umbrales.alto)}" y2="${y(umbrales.alto)}" stroke="var(--alto)" stroke-dasharray="3 4" opacity=".7"/>
    <text x="${m.i + 6}" y="${y(umbrales.alto) - 6}" style="fill:var(--alto)">ALTO ≥ ${pct(umbrales.alto, 1)}</text>
    <text x="${m.i + 6}" y="${y(umbrales.medio) - 3}" style="fill:var(--medio)" font-size="10">MEDIO ≥ ${pct(umbrales.medio, 1)}</text>
    ${marcas.join("")}${etiquetas}
    <path d="${trazo}" fill="none" stroke="var(--sello)" stroke-width="2.5" stroke-linejoin="round"/>
    ${puntos}
    <text x="${x(historia.length - 1) - 8}" y="${y(ultimo.p) - 10}" text-anchor="end" style="fill:var(--texto);font-weight:700">${pct(ultimo.p, 1)}</text>`);
}

// Actividad mensual del cuaderno: asientos totales, consultas y alertas formales.
export function actividad(meses) {
  const W = 620, H = 200, m = { i: 34, d: 8, s: 12, b: 28 };
  const max = Math.max(1, ...meses.map((x) => x.asientos));
  const ancho = (W - m.i - m.d) / meses.length;
  const y = (v) => H - m.b - (v / max) * (H - m.s - m.b);
  const paso = Math.ceil(meses.length / 10);
  const barras = meses.map((x, i) => {
    const x0 = m.i + i * ancho + ancho * 0.15, w = ancho * 0.7;
    return `<g><title>${mesCorto(x.mes)}: ${x.asientos} asientos, ${x.consultas} consultas, ${x.alertas} alertas</title>
      <rect x="${x0}" y="${y(x.asientos)}" width="${w}" height="${H - m.b - y(x.asientos)}" rx="2" fill="var(--sello)" opacity=".35"/>
      <rect x="${x0}" y="${y(x.consultas)}" width="${w}" height="${H - m.b - y(x.consultas)}" rx="2" fill="var(--medio)"/>
      ${x.alertas ? `<circle cx="${x0 + w / 2}" cy="${y(x.asientos) - 7}" r="${Math.min(6, 2.5 + x.alertas)}" fill="var(--alto)"/>` : ""}
      ${i % paso === 0 ? `<text x="${x0 + w / 2}" y="${H - 9}" text-anchor="middle">${mesCorto(x.mes)}</text>` : ""}</g>`;
  });
  return svg(W, H, "Asientos, consultas y alertas por mes", `
    <text x="${m.i - 6}" y="${y(max) + 4}" text-anchor="end">${num(max)}</text>
    <text x="${m.i - 6}" y="${H - m.b + 4}" text-anchor="end">0</text>
    <line x1="${m.i}" x2="${W - m.d}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--borde)"/>${barras.join("")}`);
}

// Calibración: probabilidad media predicha frente a tasa observada, por decil.
export function calibracion(deciles) {
  const W = 360, H = 300, m = 42;
  const max = Math.max(...deciles.map((d) => Math.max(d.prob_media, d.tasa_observada))) * 1.1;
  const e = (v) => m + (v / max) * (W - 2 * m);
  const f = (v) => H - m - (v / max) * (H - 2 * m);
  const puntos = deciles
    .map((d) => `<circle cx="${e(d.prob_media)}" cy="${f(d.tasa_observada)}" r="5" fill="var(--sello)"><title>Decil ${d.decil + 1}: predicho ${pct(d.prob_media, 1)}, observado ${pct(d.tasa_observada, 1)}</title></circle>`)
    .join("");
  return svg(W, H, "Calibración por deciles", `
    <line x1="${e(0)}" y1="${f(0)}" x2="${e(max)}" y2="${f(max)}" stroke="var(--tenue)" stroke-dasharray="4 4"/>
    <line x1="${m}" x2="${W - m}" y1="${H - m}" y2="${H - m}" stroke="var(--borde)"/>
    <line x1="${m}" x2="${m}" y1="${m}" y2="${H - m}" stroke="var(--borde)"/>
    <text x="${W / 2}" y="${H - 8}" text-anchor="middle">Probabilidad predicha</text>
    <text x="12" y="${H / 2}" text-anchor="middle" transform="rotate(-90 12 ${H / 2})">Tasa observada</text>
    <text x="${m}" y="${H - m + 16}" text-anchor="middle">0</text>
    <text x="${W - m}" y="${H - m + 16}" text-anchor="middle">${pct(max)}</text>
    <text x="${m - 6}" y="${m + 4}" text-anchor="end">${pct(max)}</text>${puntos}`);
}

// Barras horizontales en HTML (se adaptan al ancho sin reescalar el texto).
export function barras(items, { color = "var(--sello)", formato = (v) => num(v, 1) } = {}) {
  const max = Math.max(...items.map((i) => Math.abs(i.valor))) || 1;
  return `<ul class="barras">${items
    .map((i) => `<li><span class="b-etiqueta">${esc(i.etiqueta)}</span>
      <span class="b-eje"><i style="width:${(100 * Math.abs(i.valor)) / max}%;background:${i.color ?? color}"></i></span>
      <span class="b-valor num">${formato(i.valor)}</span></li>`)
    .join("")}</ul>`;
}

// Contribuciones (logit) que suben o bajan el riesgo, centradas en cero.
export function aportes(lista) {
  const max = Math.max(...lista.map((a) => Math.abs(a.peso))) || 1;
  return `<ol class="aportes">${lista
    .map((a) => {
      const w = (50 * Math.abs(a.peso)) / max;
      const sube = a.peso > 0;
      return `<li class="aporte">
        <span>${esc(a.frase)}<br><small>${esc(a.grupo)} · ${sube ? "sube" : "baja"} el riesgo (${a.peso > 0 ? "+" : ""}${num(a.peso, 2)})</small></span>
        <span class="eje" aria-hidden="true"><i style="${sube ? `left:50%;width:${w}%;background:var(--alto)` : `left:${50 - w}%;width:${w}%;background:var(--bajo)`}"></i></span>
      </li>`;
    })
    .join("")}</ol>`;
}
