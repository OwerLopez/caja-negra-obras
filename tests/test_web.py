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
    total = len(json.loads((WEB / "data" / "obras.json").read_text(encoding="utf-8")))
    assert "Modelo" in pag.inner_text("#version")
    assert f"de {total} obras" in pag.inner_text("#contador")
    assert pag.locator(".tabla-obras tbody tr").count() == min(20, total)

    # filtros en la URL: sobreviven a recargar la página
    pag.locator("#f-nivel button[data-valor=ALTO]").click()
    assert "nivel=ALTO" in pag.url
    pag.reload()
    pag.wait_for_selector(".tabla-obras tbody tr")
    assert pag.get_attribute("#f-nivel button[data-valor=ALTO]", "aria-pressed") == "true"
    assert all("Alto" in t for t in pag.locator(".tabla-obras tbody .nivel").all_inner_texts())

    # estado vacío y recuperación
    pag.fill("#f-q", "zzzz-no-existe")
    pag.wait_for_selector(".estado")
    assert "Ninguna obra coincide" in pag.inner_text("#resultado")
    pag.click("#vacio-limpiar")
    pag.wait_for_selector(".tabla-obras tbody tr")

    # orden por columna y paginación
    if ancho >= 720:
        pag.locator("button[data-orden=probabilidad]").click()
        assert pag.get_attribute("th:has(button[data-orden=probabilidad])", "aria-sort") == "ascending"
    else:  # en móvil la tabla es una lista de tarjetas y se ordena con el selector
        pag.select_option("#f-orden", "nombre-asc")
        assert "orden=nombre" in pag.url
    if total > 20:
        pag.locator(".paginador button[data-pagina='2']").first.click()
        assert "pag=2" in pag.url

    # ficha: pestañas con teclado, consultas con su asiento, historia
    pag.goto(url + "#/obra/" + PRIMERA)
    pag.wait_for_selector(".aportes")
    assert pag.locator(".aporte").count() > 0
    pag.locator("#tab-resumen").focus()
    pag.keyboard.press("ArrowRight")
    assert pag.get_attribute("#tab-consultas", "aria-selected") == "true"
    assert pag.url.endswith("/consultas")
    pag.locator(".consulta-cabeza").first.click()
    assert pag.locator(".consulta-prueba:not([hidden]) .asiento").count() >= 1
    pag.locator("#tab-historia").click()
    assert pag.locator("#panel-historia").is_visible()

    # ficha técnica: cambio de ámbito y catálogo filtrable
    pag.goto(url + "#/modelo")
    pag.wait_for_selector("#catalogo tr")
    pag.locator("#ambito button[data-valor=nacional]").click()
    assert "Todo el país" in pag.inner_text("#tabla-resultados")
    pag.fill("#cat-q", "devengado")
    assert 0 < pag.locator("#catalogo tr").count() < 53

    # ruta inválida: error claro y sin desbordes
    pag.goto(url + "#/obra/no-es-un-id")
    pag.wait_for_selector(".estado-error")
    assert pag.evaluate("document.documentElement.scrollWidth") <= ancho
    assert errores == []
    pag.close()
