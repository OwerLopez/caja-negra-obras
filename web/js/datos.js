// Lectura de los JSON estáticos que exporta scripts/p05_exportar.py, con caché en memoria.
// meta.json fija el contrato: si su versión de esquema no coincide con ESQUEMA, la web no muestra datos mezclados.

export const ESQUEMA = 1;

const cache = new Map();

export function leer(ruta) {
  if (!cache.has(ruta)) {
    const pedido = fetch(ruta).then((r) => {
      if (r.status === 404) throw new Error("Ese dato no está en el corte publicado");
      if (!r.ok) throw new Error(`No se pudo leer ${ruta} (HTTP ${r.status})`);
      return r.json();
    });
    pedido.catch(() => cache.delete(ruta));
    cache.set(ruta, pedido);
  }
  return cache.get(ruta);
}

export const obras = () => leer("data/obras.json");
export const resumen = () => leer("data/resumen.json");
export const modelo = () => leer("data/modelo.json");
export const meta = () => leer("data/meta.json");
export const obra = (id) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Promise.reject(new Error("Identificador de obra no válido"));
  return leer(`data/obra/${id}.json`).catch((e) => {
    throw new Error(e.message.startsWith("Ese dato") ? "Esa obra no está entre las obras en ejecución del corte publicado" : e.message);
  });
};
