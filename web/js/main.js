// @ts-check
// Arranque: verifica el contrato de datos, muestra la versión publicada y dibuja la vista que pide la URL.

import * as D from "./datos.js";
import { esc, fecha } from "./formato.js";
import { leerRuta } from "./router.js";
import { $, esqueleto, estadoError } from "./ui/componentes.js";
import { conectarGlosario } from "./ui/glosario.js";
import { cerrarRecorrido, iniciarRecorrido, yaVisto } from "./ui/recorrido.js";
import * as modelo from "./vistas/modelo.js";
import * as obra from "./vistas/obra.js";
import * as panorama from "./vistas/panorama.js";

const main = /** @type {HTMLElement} */ ($("#contenido"));
let turno = 0;
let vistaAnterior = "";

/** @param {string} vista */
function marcarNavegacion(vista) {
  document.querySelectorAll(".nav a[data-vista]").forEach((a) => {
    if (/** @type {HTMLElement} */ (a).dataset.vista === (vista === "obra" ? "panorama" : vista)) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

async function enrutar() {
  const ruta = leerRuta();
  const mio = ++turno;
  const cambioDeVista = ruta.vista !== vistaAnterior || ruta.vista === "obra";
  if (cambioDeVista) cerrarRecorrido();
  marcarNavegacion(ruta.vista);
  main.setAttribute("aria-busy", "true");
  if (cambioDeVista) main.innerHTML = esqueleto(ruta.vista);
  try {
    if (ruta.vista === "obra") await obra.render(main, ruta.id ?? "", ruta.sub);
    else if (ruta.vista === "modelo") await modelo.render(main, ruta.sub);
    else await panorama.render(main, ruta.query);
  } catch (e) {
    if (mio !== turno) return;
    main.innerHTML = estadoError(e instanceof D.ErrorDatos ? e.message : "Ocurrió un error inesperado al dibujar la vista");
    if (!(e instanceof D.ErrorDatos)) throw e;
  } finally {
    if (mio === turno) main.removeAttribute("aria-busy");
  }
  if (mio !== turno) return;
  if (cambioDeVista && !(ruta.vista === "modelo" && ruta.sub)) {
    window.scrollTo(0, 0);
    const h1 = main.querySelector("h1");
    if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  }
  if (ruta.vista === "panorama" && !yaVisto() && !main.querySelector(".invitacion")) {
    main.insertAdjacentHTML("afterbegin", `<div class="invitacion" role="region" aria-label="Recorrido guiado">
      <p><b>¿Primera vez aquí?</b> Un recorrido de un minuto explica qué muestra cada parte de la pantalla.</p>
      <div class="invitacion-acciones"><button type="button" class="boton boton-primario" data-accion="recorrido">Empezar recorrido</button>
      <button type="button" class="boton-texto" data-accion="descartar">Ahora no</button></div></div>`);
  }
  vistaAnterior = ruta.vista;
}

async function iniciar() {
  main.innerHTML = esqueleto(leerRuta().vista);
  try {
    const m = await D.meta();
    if (m.esquema !== D.ESQUEMA) {
      throw new D.ErrorDatos(`Los datos publicados (esquema ${m.esquema}) no corresponden a esta versión de la web (esquema ${D.ESQUEMA}). Vuelve a ejecutar scripts/p05_exportar.py y publica web/ completa`);
    }
    $("#corte").textContent = `Datos al ${fecha(m.corte)}`;
    $("#version").innerHTML = `Corte del ${esc(fecha(m.corte))}. Modelo <code>${esc(m.modelo.huella)}</code> con ${esc(String(m.modelo.arboles))} árboles y
      ${esc(String(m.modelo.indicadores))} indicadores. Código <code>${esc(m.commit ?? "local")}</code>, generado el ${esc(fecha(m.generado.slice(0, 10)))}.`;
  } catch (e) {
    main.innerHTML = estadoError(e instanceof Error ? e.message : String(e));
    main.addEventListener("click", (ev) => { if (/** @type {HTMLElement} */ (ev.target).closest('[data-accion="reintentar"]')) location.reload(); });
    return;
  }
  main.addEventListener("click", (ev) => {
    const objetivo = /** @type {HTMLElement} */ (ev.target);
    if (objetivo.closest('[data-accion="reintentar"]')) { vistaAnterior = ""; enrutar(); return; }
    const invitacion = objetivo.closest(".invitacion");
    if (invitacion && objetivo.closest('[data-accion="recorrido"]')) { invitacion.remove(); iniciarRecorrido("panorama", /** @type {HTMLElement} */ ($("#boton-recorrido"))); }
    else if (invitacion && objetivo.closest('[data-accion="descartar"]')) {
      invitacion.remove();
      try { localStorage.setItem("cn-recorrido-visto", "1"); } catch { /* sin almacenamiento */ }
    }
  });
  $("#boton-recorrido").addEventListener("click", (ev) => {
    main.querySelector(".invitacion")?.remove();
    iniciarRecorrido(leerRuta().vista, /** @type {HTMLElement} */ (ev.currentTarget));
  });
  conectarGlosario();
  window.addEventListener("hashchange", enrutar);
  enrutar();
}

iniciar();
