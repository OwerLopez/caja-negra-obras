// @ts-check
// Iconos de trazo (24 × 24, 1,75 px) en SVG en línea: no dependen de fuentes ni de red y heredan el color del texto.

/** @type {Record<string, string>} */
const TRAZOS = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  documento: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  cuaderno: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5Z"/><path d="M8 7h7M8 11h7M8 15h4"/>',
  izquierda: '<path d="m15 18-6-6 6-6"/>',
  derecha: '<path d="m9 18 6-6-6-6"/>',
  abajo: '<path d="m6 9 6 6 6-6"/>',
  sube: '<path d="m6 15 6-6 6 6"/>',
  baja: '<path d="m6 9 6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  grafico: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  filtro: '<path d="M3 5h18l-7 8v5l-4 2v-7Z"/>',
  reintentar: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
};

/**
 * @param {keyof typeof TRAZOS | string} nombre
 * @param {{ clase?: string, etiqueta?: string }} [o] etiqueta: solo si el icono transmite información por sí solo
 */
export function icono(nombre, o = {}) {
  const a11y = o.etiqueta ? `role="img" aria-label="${o.etiqueta}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icono ${o.clase ?? ""}" viewBox="0 0 24 24" ${a11y}>${TRAZOS[nombre] ?? ""}</svg>`;
}
