// Enrutador por hash: #/ panorama, #/obra/<id> ficha, #/modelo ficha técnica.

import * as D from "./datos.js";
import { esc, fecha } from "./formato.js";
import * as modelo from "./vistas/modelo.js";
import * as obra from "./vistas/obra.js";
import * as panorama from "./vistas/panorama.js";

const main = document.getElementById("contenido");
let turno = 0;

function marcar(ruta) {
  document.querySelectorAll("nav a[data-ruta]").forEach((a) => {
    if (a.dataset.ruta === ruta) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

async function enrutar() {
  const h = location.hash.replace(/^#\/?/, "");
  const mio = ++turno;
  main.setAttribute("aria-busy", "true");
  try {
    if (h.startsWith("obra/")) {
      marcar("panorama");
      await obra.render(main, decodeURIComponent(h.slice(5)));
    } else if (h === "modelo") {
      marcar("modelo");
      await modelo.render(main);
    } else {
      marcar("panorama");
      await panorama.render(main);
    }
  } catch (e) {
    if (mio !== turno) return;
    main.innerHTML = `<p class="error">${esc(e.message)}. <a href="#/">Volver al panorama</a>.</p>`;
  } finally {
    main.removeAttribute("aria-busy");
  }
  if (mio === turno) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

async function iniciar() {
  try {
    const m = await D.meta();
    if (m.esquema !== D.ESQUEMA) throw new Error(`Los datos publicados (esquema ${m.esquema}) no corresponden a esta versión de la web (esquema ${D.ESQUEMA})`);
    document.getElementById("version").textContent =
      `Corte ${fecha(m.corte)} · modelo ${m.modelo.huella} (${m.modelo.arboles} árboles, ${m.modelo.indicadores} indicadores) · código ${m.commit ?? "local"} · generado ${m.generado.slice(0, 10)}`;
  } catch (e) {
    main.innerHTML = `<p class="error">${esc(e.message)}. Vuelve a ejecutar scripts/p05_exportar.py y publica web/ completa.</p>`;
    return;
  }
  window.addEventListener("hashchange", enrutar);
  enrutar();
}

iniciar();
