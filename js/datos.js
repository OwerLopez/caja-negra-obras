// @ts-check
// Servicio de datos: lee los JSON estáticos que exporta scripts/p05_exportar.py, con caché en memoria.
// meta.json fija el contrato: si su versión de esquema no coincide con ESQUEMA, la web no muestra datos mezclados.

/** @typedef {import("./tipos.js").Meta} Meta */
/** @typedef {import("./tipos.js").ObraResumen} ObraResumen */
/** @typedef {import("./tipos.js").Resumen} Resumen */
/** @typedef {import("./tipos.js").Modelo} Modelo */
/** @typedef {import("./tipos.js").Ficha} Ficha */

export const ESQUEMA = 1;

/** Error con un mensaje apto para mostrar al usuario. */
export class ErrorDatos extends Error {
  /** @param {string} mensaje @param {number} [estado] */
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = "ErrorDatos";
    this.estado = estado;
  }
}

/** @type {Map<string, Promise<unknown>>} */
const cache = new Map();

/**
 * @template T
 * @param {string} ruta
 * @returns {Promise<T>}
 */
function leer(ruta) {
  let pedido = cache.get(ruta);
  if (!pedido) {
    pedido = fetch(ruta).then((r) => {
      if (r.status === 404) throw new ErrorDatos("Ese dato no está en el corte publicado", 404);
      if (!r.ok) throw new ErrorDatos(`No se pudo leer ${ruta} (HTTP ${r.status})`, r.status);
      return r.json();
    }, () => {
      throw new ErrorDatos("No hay conexión con el sitio. Revisa tu red e inténtalo de nuevo");
    });
    pedido.catch(() => cache.delete(ruta));
    cache.set(ruta, pedido);
  }
  return /** @type {Promise<T>} */ (pedido);
}

/** @returns {Promise<Meta>} */
export const meta = () => leer("data/meta.json");
/** @returns {Promise<ObraResumen[]>} */
export const obras = () => leer("data/obras.json");
/** @returns {Promise<Resumen>} */
export const resumen = () => leer("data/resumen.json");
/** @returns {Promise<Modelo>} */
export const modelo = () => leer("data/modelo.json");

/**
 * @param {string} id
 * @returns {Promise<Ficha>}
 */
export function obra(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Promise.reject(new ErrorDatos("El enlace no corresponde a ninguna obra"));
  return /** @type {Promise<Ficha>} */ (leer(`data/obra/${id}.json`)).catch((e) => {
    throw e instanceof ErrorDatos && e.estado === 404 ? new ErrorDatos("Esa obra no está entre las obras en ejecución del corte publicado", 404) : e;
  });
}
