"""Convierte los diagramas Mermaid de diagramas/*.mmd en PNG (para el informe y las diapositivas).

Usa Playwright con el navegador Edge del sistema y Mermaid 11 desde jsDelivr.
Salida: informe/figuras/<nombre>.png
"""
import html
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "informe" / "figuras"
SALIDA.mkdir(parents=True, exist_ok=True)
PLANTILLA = """<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#fff;font-family:Arial,sans-serif}#d{display:inline-block;padding:16px}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script></head>
<body><div id="d"><pre class="mermaid">%s</pre></div>
<script>
mermaid.initialize({startOnLoad:false, theme:'base', securityLevel:'loose',
  flowchart:{htmlLabels:true, curve:'basis', nodeSpacing:30, rankSpacing:42, wrappingWidth:320},
  er:{layoutDirection:'TB'},
  themeVariables:{fontFamily:'Arial, sans-serif', fontSize:'15px', primaryColor:'#ffffff', primaryBorderColor:'#2b4c9b',
    primaryTextColor:'#1c2a39', lineColor:'#4b5a6a', secondaryColor:'#f1f3f2', tertiaryColor:'#f6f8fa',
    clusterBkg:'#f6f8fa', clusterBorder:'#cfd6dd', actorBkg:'#ffffff', actorBorder:'#2b4c9b', noteBkgColor:'#fbf1de',
    taskBkgColor:'#2b4c9b', activeTaskBkgColor:'#2f6f4b', critBkgColor:'#b42318', doneTaskBkgColor:'#9aa7b4',
    sectionBkgColor:'#f6f8fa', altSectionBkgColor:'#ffffff', gridColor:'#cfd6dd'}});
mermaid.run().then(()=>{document.body.dataset.listo='1'}).catch(e=>{document.body.dataset.error=String(e)});
</script></body></html>"""

nombres = sys.argv[1:] or [p.stem for p in sorted((RAIZ / "diagramas").glob("*.mmd"))]
with sync_playwright() as p:
    nav = p.chromium.launch(channel="msedge")
    pag = nav.new_page(device_scale_factor=2, viewport={"width": 1500, "height": 900})
    for n in nombres:
        fuente = (RAIZ / "diagramas" / f"{n}.mmd").read_text(encoding="utf-8")
        pag.set_content(PLANTILLA % html.escape(fuente), wait_until="networkidle")
        pag.wait_for_function("document.body.dataset.listo || document.body.dataset.error", timeout=30000)
        err = pag.evaluate("document.body.dataset.error")
        if err:
            print(f"ERROR {n}: {err}")
            continue
        pag.locator("#d").screenshot(path=str(SALIDA / f"{n}.png"))
        print("ok", n)
    nav.close()
