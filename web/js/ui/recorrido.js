// @ts-check
// Recorrido guiado con globos: explica cada pantalla y cada pestaña paso a paso, señalando el elemento real.
// Cada vista se ofrece una vez (se recuerda en este navegador) y se puede repetir desde «Recorrido guiado».

import { esc } from "../formato.js";
import { icono } from "./iconos.js";

/** @typedef {{ selector: string, titulo: string, texto: string, antes?: () => void }} Paso */

/** Activa una pestaña de la ficha antes de señalar algo que vive dentro de ella. @param {string} id */
const pestana = (id) => () => {
  const b = document.getElementById(`tab-${id}`);
  if (b && b.getAttribute("aria-selected") !== "true") b.click();
};
/** Abre la primera consulta para mostrar su prueba escrita. */
const abrirConsulta = () => {
  pestana("consultas")();
  const b = document.querySelector("#consultas .consulta:not([hidden]) .consulta-cabeza");
  if (b instanceof HTMLButtonElement && b.getAttribute("aria-expanded") !== "true") b.click();
};

/** @type {Record<string, Paso[]>} */
const PASOS = {
  panorama: [
    { selector: ".resumen-principal .distribucion", titulo: "Cuántas obras hay y qué tan riesgosas son",
      texto: "Cada obra pública en ejecución de Arequipa recibe un nivel de riesgo: alto (rojo), medio (ámbar) o bajo (verde). La barra muestra cuántas hay de cada nivel." },
    { selector: ".niveles-leyenda", titulo: "Qué significa cada nivel",
      texto: "Cada nivel tiene un umbral de probabilidad y una prueba: qué parte de los casos de ese nivel terminó de verdad en atraso cuando probamos el sistema con meses que no conocía." },
    { selector: ".resumen-lateral", titulo: "Contexto en dos datos",
      texto: "Cuántas obras tienen preguntas del residente sin responder a tiempo, y cuántas obras ya estaban paralizadas en Arequipa según la Contraloría." },
    { selector: "#filtros", titulo: "Busca y filtra",
      texto: "Escribe el nombre de una obra, una entidad o un distrito, o filtra por nivel de riesgo, provincia u obras con consultas vencidas. Los filtros quedan en la dirección de la página: puedes compartir el enlace." },
    { selector: ".tabla-obras tbody tr:first-child td:nth-child(2)", titulo: "Riesgo a 60 días",
      texto: "Probabilidad de que la obra anote un atraso legal en los próximos 60 días: que su avance real quede por debajo del 80 % de lo programado o que deba acelerar su calendario." },
    { selector: ".tabla-obras tbody tr:first-child td:nth-child(3)", titulo: "Cambio en el mes",
      texto: "Cuánto subió (flecha roja) o bajó (flecha verde) el riesgo frente al mes anterior, en puntos porcentuales." },
    { selector: ".tabla-obras tbody tr:first-child td:nth-child(4)", titulo: "Consultas vencidas",
      texto: "Preguntas que el residente anotó en el cuaderno y que nadie respondió dentro del plazo legal (5 días, o 21 si interviene el proyectista). Son una señal de que algo traba la obra." },
    { selector: ".tabla-obras tbody tr:first-child td:nth-child(5)", titulo: "Lo que más empuja el riesgo",
      texto: "El dato de la obra que más subió su riesgo en el cálculo. En la ficha se ven los ocho más importantes." },
    { selector: ".tabla-obras tbody tr:first-child .obra-enlace", titulo: "Abre una obra",
      texto: "La ficha explica por qué tiene ese riesgo, quién debe responder cada consulta y muestra el texto original del cuaderno como prueba. Allí hay otro recorrido." },
    { selector: "#boton-leyenda", titulo: "Leyenda",
      texto: "Si olvidas qué significa un color o un símbolo, la leyenda lo explica todo en un solo lugar. Los botones «?» junto a las palabras técnicas dan su definición." },
  ],
  obra: [
    { selector: ".ficha-identidad", antes: pestana("resumen"), titulo: "Datos de la obra",
      texto: "Nombre oficial, entidad que la contrata, empresa contratista, ubicación y el periodo que cubre su cuaderno de obra digital." },
    { selector: ".ficha-riesgo", titulo: "Probabilidad y nivel",
      texto: "La probabilidad de atraso legal en los próximos 60 días, su nivel y cuántas veces supera a la obra promedio de Arequipa." },
    { selector: ".pestanas", titulo: "Tres pestañas",
      texto: "Resumen explica el riesgo; Consultas muestra las preguntas del residente y si se respondieron a tiempo; Historia muestra lo anotado mes a mes. El número indica cuántos elementos tiene cada una." },
    { selector: "section[aria-labelledby=t-razones]", antes: pestana("resumen"), titulo: "Por qué tiene este riesgo",
      texto: "Cada barra es un dato de la obra que influyó en el cálculo. Las rojas suben el riesgo y las verdes lo bajan; las más largas pesan más." },
    { selector: "section[aria-labelledby=t-evolucion]", titulo: "Evolución mes a mes",
      texto: "La línea azul es la probabilidad calculada al cierre de cada mes. La franja roja es la zona de riesgo alto y la ámbar la de riesgo medio." },
    { selector: "section[aria-labelledby=t-indicadores]", titulo: "Indicadores clave",
      texto: "Datos concretos de plazo, avance, dinero, historial y temporada. Lo que la fuente oficial no registra para esta obra se lista aparte como «sin dato»." },
    { selector: ".filtro-estados", antes: pestana("consultas"), titulo: "Estado de las consultas",
      texto: "Cuántas consultas del residente están vencidas sin respuesta, cuántas se respondieron tarde, cuántas esperan dentro del plazo y cuántas se respondieron a tiempo. Toca un estado para filtrar la lista." },
    { selector: "#consultas .consulta:not([hidden])", antes: abrirConsulta, titulo: "Cada consulta con su prueba",
      texto: "Muestra quién debía responder, el plazo y los días que pasaron. Abierta, aparece la hoja del cuaderno con el número de asiento sellado: es el texto original, con los nombres de personas ocultos." },
    { selector: "#panel-historia .grafico", antes: pestana("historia"), titulo: "Actividad del cuaderno",
      texto: "Barras azules: anotaciones de cada mes. Ámbar: consultas del residente. Un punto rojo marca meses con suspensiones, ampliaciones, riesgos o penalidades." },
    { selector: "#panel-historia .subtitulo", titulo: "Hechos formales",
      texto: "Debajo están los hechos que la ley obliga a anotar (inicio del plazo, suspensiones, ampliaciones, penalidades), del más reciente al más antiguo, cada uno con su asiento." },
    { selector: ".migas a", antes: pestana("resumen"), titulo: "Volver al panorama",
      texto: "Regresa a la lista de obras con los mismos filtros que tenías." },
  ],
  modelo: [
    { selector: "#simple", titulo: "En palabras simples",
      texto: "Cómo trabaja el sistema en cuatro pasos, cómo leer una probabilidad, qué tan confiable es y qué no hace. Esta parte es para todo público." },
    { selector: ".indice", titulo: "Índice de la página",
      texto: "La primera sección es para todos. Las siguientes son para especialistas: fórmulas, métricas y validación, para que un auditor o un ingeniero pueda verificar cada cifra." },
    { selector: "#ejemplo", titulo: "Ejemplo resuelto",
      texto: "La cuenta completa de una obra real: cuánto aporta cada dato y cómo se convierte en la probabilidad que ves en su ficha." },
    { selector: "#resultados", titulo: "Qué tan bien acierta",
      texto: "Compara el sistema con formas más simples de elegir qué obras revisar, en meses que el modelo nunca vio. Incluye lo que no salió tan bien. Puedes ver Arequipa o todo el país." },
    { selector: "#niveles", titulo: "Niveles y anticipación",
      texto: "Qué pasó después con las obras de cada nivel y con cuántos días de anticipación avisó el sistema." },
    { selector: "#indicadores", titulo: "Los 53 indicadores",
      texto: "Qué mide cada dato, su fórmula, de qué fuente oficial sale y qué tanto pesa. Puedes buscar o filtrar por grupo." },
    { selector: "#datos", titulo: "Datos y límites",
      texto: "Cómo se separaron los meses para entrenar y para probar, y los límites que el sistema declara." },
  ],
};

/** Texto de la invitación que se muestra la primera vez que se abre cada vista. */
export const INVITACION = {
  panorama: "Un recorrido de un minuto explica qué muestra cada parte de esta pantalla.",
  obra: "Un recorrido corto explica el riesgo, las consultas y la historia de esta obra.",
  modelo: "Un recorrido corto explica qué parte de esta página es para todos y cuál para especialistas.",
};

/** @param {string} vista */
const clave = (vista) => `cn-recorrido-visto-${vista}`;

/** @param {string} vista @returns {boolean} */
export function yaVisto(vista) {
  try { return localStorage.getItem(clave(vista)) === "1"; } catch { return true; }
}
/** @param {string} vista */
export function marcarVisto(vista) {
  try { localStorage.setItem(clave(vista), "1"); } catch { /* sin almacenamiento: la invitación vuelve a aparecer */ }
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
    globo.style.setProperty("--flecha", `${Math.min(Math.max(20, r.left + Math.min(r.width, 160) / 2 - left), g.width - 20)}px`);
    const tope = document.querySelector(".barra")?.getBoundingClientRect().bottom ?? 0; // no tapar la barra superior fija
    const cabeAbajo = r.bottom + margen + g.height <= window.innerHeight;
    const cabeArriba = r.top - margen - g.height >= tope;
    if (!cabeAbajo && !cabeArriba) { // elemento más alto que la pantalla: el globo se fija abajo, sin flecha
      globo.style.top = `${window.innerHeight - g.height - margen}px`;
      globo.dataset.lado = "fijo";
      return;
    }
    globo.style.top = `${cabeAbajo ? r.bottom + margen : r.top - margen - g.height}px`;
    globo.dataset.lado = cabeAbajo ? "abajo" : "arriba";
  };

  const mostrar = () => {
    objetivo?.classList.remove("resaltado");
    const paso = pasos[i];
    paso.antes?.();
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
    marcarVisto(vista);
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
