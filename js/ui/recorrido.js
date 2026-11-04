// @ts-check
// Recorrido guiado con globos: explica cada pantalla paso a paso, señalando el elemento real.
// Se ofrece solo la primera vez (se recuerda en este navegador) y se puede repetir desde «Recorrido guiado».

import { esc } from "../formato.js";
import { icono } from "./iconos.js";

/** @typedef {{ selector: string, titulo: string, texto: string }} Paso */

/** @type {Record<string, Paso[]>} */
const PASOS = {
  panorama: [
    { selector: ".resumen-principal", titulo: "Cuántas obras hay y qué tan riesgosas son",
      texto: "Cada obra pública en ejecución recibe un nivel de riesgo: alto, medio o bajo. Debajo se explica cada nivel y qué proporción de los casos de ese nivel terminó en atraso cuando probamos el sistema." },
    { selector: ".resumen-lateral", titulo: "Contexto en dos datos",
      texto: "Cuántas obras tienen preguntas del residente sin responder a tiempo, y cuántas obras ya están paralizadas en Arequipa según la Contraloría." },
    { selector: "#filtros", titulo: "Busca y filtra",
      texto: "Escribe el nombre de una obra, entidad o distrito, o filtra por nivel de riesgo y provincia. Los filtros quedan en la dirección de la página: puedes compartir el enlace." },
    { selector: ".tabla-obras tbody tr:first-child td:nth-child(2)", titulo: "Riesgo a 60 días",
      texto: "Es la probabilidad de que la obra anote un atraso legal en los próximos 60 días: que su avance real quede por debajo del 80 % de lo programado o que deba acelerar su calendario." },
    { selector: ".tabla-obras tbody tr:first-child td:nth-child(4)", titulo: "Consultas vencidas",
      texto: "Preguntas que el residente anotó en el cuaderno y que nadie respondió dentro del plazo legal (5 días, o 21 si interviene el proyectista). Son una señal de que algo traba la obra." },
    { selector: ".tabla-obras tbody tr:first-child .obra-enlace", titulo: "Abre una obra",
      texto: "En la ficha verás por qué tiene ese riesgo, quién debe responder cada consulta y el texto original del cuaderno como prueba." },
  ],
  obra: [
    { selector: ".ficha-riesgo", titulo: "Probabilidad y nivel",
      texto: "La probabilidad de atraso legal en 60 días y su nivel. También indica cuántas veces supera a la obra promedio de Arequipa." },
    { selector: ".aportes", titulo: "Por qué tiene este riesgo",
      texto: "Cada barra es un dato de la obra que influyó en el cálculo. Las rojas suben el riesgo y las verdes lo bajan; las más largas pesan más." },
    { selector: "#tab-consultas", titulo: "Consultas del residente",
      texto: "Lista cada pregunta anotada, quién debía responder, cuántos días pasaron y si se cumplió el plazo legal. Al abrir una consulta aparece el asiento original del cuaderno." },
    { selector: "#tab-historia", titulo: "Historia del cuaderno",
      texto: "Cuánto se escribió cada mes y los hechos formales: inicio del plazo, suspensiones, ampliaciones, penalidades, cada uno con su asiento." },
  ],
  modelo: [
    { selector: ".indice", titulo: "Índice de la página",
      texto: "Esta página explica cómo se calcula el riesgo. Usa el índice para saltar a las fórmulas, al ejemplo resuelto o a los resultados." },
    { selector: "#ejemplo", titulo: "Ejemplo resuelto",
      texto: "La cuenta completa de una obra real: cuánto aporta cada dato y cómo se convierte en la probabilidad que ves en su ficha." },
    { selector: "#resultados", titulo: "Qué tan bien acierta",
      texto: "Compara el sistema con formas más simples de elegir qué obras revisar, en meses que el modelo nunca vio. Incluye lo que no salió tan bien." },
  ],
};

const CLAVE = "cn-recorrido-visto";

/** @returns {boolean} */
export function yaVisto() {
  try { return localStorage.getItem(CLAVE) === "1"; } catch { return true; }
}
function marcarVisto() {
  try { localStorage.setItem(CLAVE, "1"); } catch { /* sin almacenamiento: el recorrido simplemente vuelve a ofrecerse */ }
}

/** @type {(() => void) | null} */
let cerrarActual = null;

/** Cierra el recorrido en curso (al cambiar de vista). */
export const cerrarRecorrido = () => cerrarActual?.();

/**
 * Inicia el recorrido de una vista.
 * @param {string} vista
 * @param {HTMLElement | null} [origen] elemento que recupera el foco al cerrar
 */
export function iniciarRecorrido(vista, origen = null) {
  cerrarActual?.();
  const pasos = (PASOS[vista] ?? []).filter((p) => document.querySelector(p.selector));
  if (!pasos.length) return;
  let i = 0;
  /** @type {Element | null} */
  let objetivo = null;
  const globo = document.createElement("div");
  globo.className = "globo";
  globo.setAttribute("role", "dialog");
  globo.setAttribute("aria-labelledby", "globo-titulo");
  globo.setAttribute("aria-describedby", "globo-texto");
  document.body.append(globo);

  const ubicar = () => {
    if (!objetivo) return;
    const r = objetivo.getBoundingClientRect();
    const g = globo.getBoundingClientRect();
    const margen = 12;
    const left = Math.min(Math.max(margen, r.left), window.innerWidth - g.width - margen);
    globo.style.left = `${left}px`;
    const cabeAbajo = r.bottom + margen + g.height <= window.innerHeight;
    const cabeArriba = r.top - margen - g.height >= 0;
    if (!cabeAbajo && !cabeArriba) { // elemento más alto que la pantalla: el globo se fija abajo, sin flecha
      globo.style.top = `${window.innerHeight - g.height - margen}px`;
      globo.dataset.lado = "fijo";
      return;
    }
    globo.style.top = `${cabeAbajo ? r.bottom + margen : r.top - margen - g.height}px`;
    globo.dataset.lado = cabeAbajo ? "abajo" : "arriba";
    globo.style.setProperty("--flecha", `${Math.min(Math.max(20, r.left + Math.min(r.width, 160) / 2 - left), g.width - 20)}px`);
  };

  const mostrar = () => {
    objetivo?.classList.remove("resaltado");
    const paso = pasos[i];
    objetivo = document.querySelector(paso.selector);
    objetivo?.classList.add("resaltado");
    globo.innerHTML = `<p class="globo-paso">Paso ${i + 1} de ${pasos.length}</p>
      <h2 id="globo-titulo" class="globo-titulo" tabindex="-1">${esc(paso.titulo)}</h2>
      <p id="globo-texto" class="globo-texto">${esc(paso.texto)}</p>
      <div class="globo-acciones">
        <button type="button" class="boton-texto" data-accion="cerrar">Salir del recorrido</button>
        <span class="globo-nav">
          ${i > 0 ? `<button type="button" class="boton" data-accion="atras">${icono("izquierda")}Anterior</button>` : ""}
          <button type="button" class="boton boton-primario" data-accion="siguiente">${i < pasos.length - 1 ? `Siguiente${icono("derecha")}` : "Terminar"}</button>
        </span>
      </div>`;
    const alto = (objetivo?.getBoundingClientRect().height ?? 0) > window.innerHeight * 0.5;
    objetivo?.scrollIntoView({ block: alto ? "start" : "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    requestAnimationFrame(() => { ubicar(); /** @type {HTMLElement} */ (globo.querySelector("#globo-titulo")).focus({ preventScroll: true }); });
    window.setTimeout(ubicar, 350);
  };

  const cerrar = () => {
    objetivo?.classList.remove("resaltado");
    globo.remove();
    window.removeEventListener("resize", ubicar);
    window.removeEventListener("scroll", ubicar, true);
    document.removeEventListener("keydown", teclas);
    marcarVisto();
    cerrarActual = null;
    origen?.focus();
  };
  /** @param {KeyboardEvent} e */
  const teclas = (e) => {
    if (e.key === "Escape") cerrar();
    else if (e.key === "ArrowRight" && i < pasos.length - 1) { i += 1; mostrar(); }
    else if (e.key === "ArrowLeft" && i > 0) { i -= 1; mostrar(); }
  };
  globo.addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("button[data-accion]");
    if (!(b instanceof HTMLButtonElement)) return;
    const accion = b.dataset.accion;
    if (accion === "cerrar" || (accion === "siguiente" && i === pasos.length - 1)) cerrar();
    else { i += accion === "siguiente" ? 1 : -1; mostrar(); }
  });
  window.addEventListener("resize", ubicar);
  window.addEventListener("scroll", ubicar, true);
  document.addEventListener("keydown", teclas);
  cerrarActual = cerrar;
  mostrar();
}
