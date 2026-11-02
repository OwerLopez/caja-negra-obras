// Formato y utilidades compartidas por todas las vistas.

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);

const nf = (d) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = (v, d = 0) => nf(d).format(v);
export const pct = (v, d = 0) => `${nf(d).format(100 * v)} %`;
export const millones = (v) => `S/ ${nf(0).format(v / 1e6)} millones`;
export const fecha = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const mesCorto = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

export const NIVEL = { ALTO: "Riesgo alto", MEDIO: "Riesgo medio", BAJO: "Riesgo bajo" };
export const COLOR_NIVEL = { ALTO: "var(--alto)", MEDIO: "var(--medio)", BAJO: "var(--bajo)" };
export const nivelChip = (n) => `<span class="nivel nivel-${esc(n)}">${NIVEL[n] ?? esc(n)}</span>`;

// Puntos porcentuales con signo para tendencias mensuales.
export const puntos = (v) => {
  if (v == null) return `<span class="nota">—</span>`;
  const p = 100 * v;
  if (Math.abs(p) < 0.5) return `<span class="nota">estable</span>`;
  return `<span class="${p > 0 ? "subir" : "bajar"}">${p > 0 ? "▲ +" : "▼ "}${nf(0).format(p)} pts</span>`;
};

export const ESTADO = {
  "Sin respuesta en el cuaderno": { clase: "Sin", corto: "Sin respuesta" },
  Tarde: { clase: "Tarde", corto: "Respondida tarde" },
  "En plazo": { clase: "En", corto: "Esperando, en plazo" },
  "A tiempo": { clase: "A", corto: "Respondida a tiempo" },
};
