"""Mide el prototipo: tiempos de carga, peso de los datos, errores de consola (5 repeticiones), accesibilidad con
axe-core (WCAG 2 A/AA) en las tres vistas y resultado de la suite de pruebas (pytest).

Requiere el prototipo servido en http://127.0.0.1:8765. Salida: resultados/prototipo.json
"""
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:8765/"
datos = RAIZ / "web" / "data"
obras = json.loads((datos / "obras.json").read_text(encoding="utf-8"))
fichas = list((datos / "obra").glob("*.json"))
res = {"obras": len(obras), "peso_obras_json_kb": round((datos / "obras.json").stat().st_size / 1024, 1),
       "peso_ficha_kb_mediana": round(statistics.median(f.stat().st_size for f in fichas) / 1024, 1),
       "peso_ficha_kb_max": round(max(f.stat().st_size for f in fichas) / 1024, 1),
       "peso_web_total_kb": round(sum(f.stat().st_size for f in (RAIZ / "web").rglob("*") if f.is_file()) / 1024, 1)}
t_lista, t_ficha, errores = [], [], []
with sync_playwright() as p:
    nav = p.chromium.launch(channel="msedge")
    for i in range(5):
        pag = nav.new_page()
        pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
        pag.goto(URL, wait_until="domcontentloaded")
        pag.wait_for_selector(".tabla-obras tbody tr")
        t_lista.append(pag.evaluate("performance.now()"))
        t0 = pag.evaluate("performance.now()")
        pag.goto(URL + "#/obra/" + obras[i]["id"])
        pag.wait_for_selector("#hitos")
        t_ficha.append(pag.evaluate("performance.now()") - t0)
        pag.close()
    ctx = nav.new_context(bypass_csp=True)  # la CSP del sitio bloquea scripts externos; axe se inyecta solo para auditar
    pag = ctx.new_page()
    axe = {}
    for ruta, sel in (("#/", ".tabla-obras tbody tr"), ("#/obra/" + obras[0]["id"], "#hitos"), ("#/modelo", "#ejemplo table")):
        pag.goto(URL + ruta)
        pag.wait_for_selector(sel, state="attached")
        pag.wait_for_timeout(500)
        pag.add_script_tag(url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js")
        axe[ruta.split("/")[1] or "panorama"] = pag.evaluate(
            "async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa']})).violations.length")
    nav.close()
res["axe_violaciones_wcag_aa"] = axe
salida = subprocess.run([sys.executable, "-m", "pytest", "-o", "addopts=", "-q", "-p", "no:cacheprovider"], cwd=RAIZ, capture_output=True, text=True).stdout
res["pruebas"] = {k: int(m.group(1)) if (m := re.search(rf"(\d+) {k}", salida)) else 0 for k in ("passed", "failed")}
res["ms_lista_hasta_mostrar_obras_mediana"] = round(statistics.median(t_lista))
res["ms_abrir_ficha_mediana"] = round(statistics.median(t_ficha))
res["errores_consola"] = len(errores)
res["errores_texto"] = sorted(set(errores))
res["condiciones"] = "servidor local, Edge sin caché por pestaña nueva, 5 repeticiones"
(RAIZ / "resultados" / "prototipo.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(res, ensure_ascii=False, indent=1))
