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


def panel(pag, titulo):
    return pag.locator("section.panel", has=pag.locator("h2", has_text=titulo))


with sync_playwright() as p:
    nav = p.chromium.launch(channel="msedge")
    pag = nav.new_page(viewport={"width": 1366, "height": 860}, device_scale_factor=2)
    pag.goto(URL)
    pag.wait_for_selector(".tabla-obras tbody tr")
    pag.wait_for_timeout(500)
    pag.screenshot(path=str(FIG / "c01_panorama.png"))

    pag.goto(URL + "#/obra/" + OBRA)
    pag.wait_for_selector(".aportes")
    pag.wait_for_timeout(500)
    pag.screenshot(path=str(FIG / "c02_ficha.png"))
    panel(pag, "Indicadores clave").screenshot(path=str(FIG / "c03_indicadores.png"))
    pag.locator(".consulta > button").first.click()
    pag.wait_for_timeout(400)
    panel(pag, "Consultas del residente").screenshot(path=str(FIG / "c04_consultas.png"))
    panel(pag, "Historia del cuaderno").screenshot(path=str(FIG / "c05_historia.png"))

    pag.goto(URL + "#/modelo")
    pag.wait_for_selector("#ejemplo table")
    pag.wait_for_timeout(400)
    panel(pag, "Fórmulas").screenshot(path=str(FIG / "c06_formulas.png"))
    panel(pag, "Ejemplo resuelto").screenshot(path=str(FIG / "c07_ejemplo.png"))
    panel(pag, "Resultados en la prueba").screenshot(path=str(FIG / "c08_metricas.png"))
    pag.locator(".rejilla.dos").first.screenshot(path=str(FIG / "c09_importancia.png"))

    movil = nav.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    movil.goto(URL)
    movil.wait_for_selector(".tabla-obras tbody tr")
    movil.wait_for_timeout(400)
    movil.screenshot(path=str(FIG / "c10_movil.png"))
    nav.close()
print("ok")
