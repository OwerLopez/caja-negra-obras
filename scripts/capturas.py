"""Capturas del prototipo para el informe y las diapositivas (modo claro).

Requiere el prototipo servido en http://127.0.0.1:8765 (python -m http.server 8765 --directory web).
Salida: informe/figuras/c*.png
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[1]
FIG = RAIZ / "informe" / "figuras"
URL = "http://127.0.0.1:8765/"
OBRA = "3b4f16b6-12e9-4ac9-a344-b4e178fd868b"

with sync_playwright() as p:
    nav = p.chromium.launch(channel="msedge")
    pag = nav.new_page(viewport={"width": 1280, "height": 820}, device_scale_factor=2, color_scheme="light")
    pag.goto(URL)
    pag.wait_for_selector(".renglon")
    pag.screenshot(path=str(FIG / "c01_lista.png"))
    pag.goto(URL + "#/obra/" + OBRA)
    pag.wait_for_selector("#q1")
    pag.wait_for_timeout(600)
    pag.locator("section[aria-labelledby=q1]").screenshot(path=str(FIG / "c02_riesgo.png"))
    pag.locator(".consulta > button").nth(3).click()
    pag.wait_for_timeout(400)
    pag.locator("section[aria-labelledby=q2]").screenshot(path=str(FIG / "c03_quien_traba.png"))
    pag.locator("section[aria-labelledby=q3]").screenshot(path=str(FIG / "c04_que_pasa.png"))
    pag.goto(URL + "#/metodo")
    pag.wait_for_selector(".pasos")
    pag.wait_for_timeout(300)
    pag.screenshot(path=str(FIG / "c05_metodo.png"), full_page=True)
    movil = nav.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
    movil.goto(URL)
    movil.wait_for_selector(".renglon")
    movil.screenshot(path=str(FIG / "c06_movil.png"))
    nav.close()
print("ok")
