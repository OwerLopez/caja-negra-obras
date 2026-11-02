"""Mide el prototipo: tiempos de carga, peso de los datos y errores de consola (5 repeticiones).

Requiere el prototipo servido en http://127.0.0.1:8765. Salida: resultados/prototipo.json
"""
import json
import statistics
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
    nav.close()
res["ms_lista_hasta_mostrar_obras_mediana"] = round(statistics.median(t_lista))
res["ms_abrir_ficha_mediana"] = round(statistics.median(t_ficha))
res["errores_consola"] = len(errores)
res["errores_texto"] = sorted(set(errores))
res["condiciones"] = "servidor local, Edge sin caché por pestaña nueva, 5 repeticiones"
(RAIZ / "resultados" / "prototipo.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(res, ensure_ascii=False, indent=1))
