// Enrutador por hash: #/ panorama, #/obra/<id> ficha, #/modelo ficha técnica.

import { esc } from "./formato.js";
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

window.addEventListener("hashchange", enrutar);
enrutar();
