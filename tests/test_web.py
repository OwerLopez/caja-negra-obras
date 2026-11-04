"""Prueba de humo de la web en un navegador real: rutas, interacción, errores de consola y diseño móvil."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

playwright = pytest.importorskip("playwright.sync_api")
WEB = Path(__file__).resolve().parents[1] / "web"
PRIMERA = json.loads((WEB / "data" / "obras.json").read_text(encoding="utf-8"))[0]["id"]


class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def url():
    srv = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Silencioso, directory=str(WEB)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}/"
    srv.shutdown()


@pytest.fixture(scope="module")
def navegador():
    with playwright.sync_playwright() as p:
        try:
            nav = p.chromium.launch()
        except Exception:  # equipos sin Chromium de Playwright: usar Edge del sistema
            nav = p.chromium.launch(channel="msedge")
        yield nav
        nav.close()


@pytest.mark.parametrize("ancho", [1366, 390])
def test_recorrido_completo(url, navegador, ancho):
    pag = navegador.new_page(viewport={"width": ancho, "height": 820})
    errores = []
    pag.on("pageerror", lambda e: errores.append(str(e)))
    pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)

    pag.goto(url)
    pag.wait_for_selector(".tabla-obras tbody tr")
    assert pag.locator(".tabla-obras tbody tr").count() == len(json.loads((WEB / "data" / "obras.json").read_text(encoding="utf-8")))
    assert "modelo" in pag.inner_text("#version")
    pag.fill("#f-texto", "zzzz-no-existe")
    assert "Ninguna obra" in pag.inner_text("#cuerpo")
    pag.fill("#f-texto", "")
    pag.locator("th[data-clave=probabilidad] button").click()
    assert pag.get_attribute("th[data-clave=probabilidad]", "aria-sort") == "ascending"

    pag.goto(url + "#/obra/" + PRIMERA)
    pag.wait_for_selector("#hitos", state="attached")
    assert pag.locator(".aporte").count() > 0
    pag.locator(".consulta > button").first.click()
    assert pag.locator(".consulta.abierta .asiento").count() >= 1

    pag.goto(url + "#/modelo")
    pag.wait_for_selector("#ejemplo table")
    pag.locator("#ambito button[data-v=nacional]").click()
    assert "Prueba nacional" in pag.inner_text("#metricas")

    pag.goto(url + "#/obra/no-es-un-id")
    pag.wait_for_selector(".error")
    assert pag.evaluate("document.documentElement.scrollWidth") <= ancho
    assert errores == []
    pag.close()
