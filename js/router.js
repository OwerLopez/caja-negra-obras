// @ts-check
// Enrutador por hash. La ruta guarda la vista y su estado (filtros, página, pestaña) para que todo enlace sea compartible:
//   #/?nivel=ALTO&pag=2   panorama          #/obra/<id>/consultas   ficha en la pestaña Consultas
//   #/modelo/resultados   ficha técnica, sección Resultados

/**
 * @typedef {object} Ruta
 * @property {"panorama" | "obra" | "modelo"} vista
 * @property {string} [id]
 * @property {string} [sub]
 * @property {URLSearchParams} query
 */

/** @returns {Ruta} */
export function leerRuta() {
  const [camino, q = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const partes = camino.split("/").filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(q);
  if (partes[0] === "obra" && partes[1]) return { vista: "obra", id: partes[1], sub: partes[2], query };
  if (partes[0] === "modelo") return { vista: "modelo", sub: partes[1], query };
  return { vista: "panorama", query };
}

/**
 * @param {string[]} partes
 * @param {URLSearchParams | Record<string, string>} [query]
 */
function armar(partes, query) {
  const q = new URLSearchParams(query);
  const s = q.toString();
  return `#/${partes.map(encodeURIComponent).join("/")}${s ? `?${s}` : ""}`;
}

/** Enlace a una ruta (para href). @param {string[]} partes @param {Record<string, string>} [query] */
export const enlace = (partes, query) => armar(partes, query);

/**
 * Actualiza la URL sin volver a dibujar la vista (filtros, pestañas). No agrega una entrada al historial.
 * @param {string[]} partes
 * @param {URLSearchParams | Record<string, string>} [query]
 */
export function reemplazar(partes, query) {
  history.replaceState(null, "", armar(partes, query));
}
