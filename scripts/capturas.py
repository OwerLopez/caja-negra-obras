"""Capturas del prototipo para el informe y las diapositivas.

Requiere el prototipo servido en http://127.0.0.1:8765 (python -m http.server 8765 --directory web).
Salida: informe/figuras/c*.png
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[1]
FIG = RAIZ / "informe" / "figuras"
URL = "http://127.0.0.1:8765/"
OBRA = json.loads((RAIZ / "web" / "data" / "obras.json").read_text(encoding="utf-8"))[0]["id"]
SIN_INVITACION = "try { localStorage.setItem('cn-recorrido-visto', '1') } catch (e) {}"


def foto(loc, nombre):
    loc.scroll_into_view_if_needed()
    loc.page.wait_for_timeout(250)
    loc.screenshot(path=str(FIG / nombre))


with sync_playwright() as p:
    nav = p.chromium.launch(channel="msedge")
    ctx = nav.new_context(viewport={"width": 1366, "height": 860}, device_scale_factor=2)
    ctx.add_init_script(SIN_INVITACION)
    pag = ctx.new_page()
    pag.goto(URL)
    pag.wait_for_selector(".tabla-obras tbody tr")
    pag.wait_for_timeout(500)
    pag.screenshot(path=str(FIG / "c01_panorama.png"))

    pag.goto(URL + "#/obra/" + OBRA)
    pag.wait_for_selector(".aportes")
    pag.wait_for_timeout(500)
    pag.screenshot(path=str(FIG / "c02_ficha.png"))
    foto(pag.locator("section[aria-labelledby=t-indicadores]"), "c03_indicadores.png")
    pag.click("#tab-consultas")
    pag.locator(".consulta-cabeza").first.click()
    pag.wait_for_timeout(300)
    foto(pag.locator("#panel-consultas"), "c04_consultas.png")
    pag.click("#tab-historia")
    foto(pag.locator("#panel-historia"), "c05_historia.png")

    pag.goto(URL + "#/modelo")
    pag.wait_for_selector("#catalogo tr")
    for seccion, nombre in (("#formulas", "c06_formulas.png"), ("#ejemplo", "c07_ejemplo.png"), ("#resultados", "c08_metricas.png"), ("#pesos", "c09_importancia.png")):
        foto(pag.locator(seccion), nombre)

    # recorrido guiado en su primer paso
    pag.goto(URL)
    pag.wait_for_selector(".tabla-obras tbody tr")
    pag.click("#boton-recorrido")
    pag.wait_for_selector(".globo")
    pag.wait_for_timeout(600)
    pag.screenshot(path=str(FIG / "c11_recorrido.png"))

    movil = nav.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    movil.add_init_script(SIN_INVITACION)
    m = movil.new_page()
    m.goto(URL)
    m.wait_for_selector(".tabla-obras tbody tr")
    m.wait_for_timeout(400)
    m.screenshot(path=str(FIG / "c10_movil.png"))
    nav.close()
print("ok")
