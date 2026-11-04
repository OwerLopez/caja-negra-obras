"""Extrae título y notas del orador de cada diapositiva para el guion (presentaciones/fuente/notas.json).

Requiere python-pptx. Uso: python presentaciones/fuente/extraer_notas.py
"""
import json
from pathlib import Path

from pptx import Presentation

CARPETA = Path(__file__).resolve().parents[1]
pres = Presentation(CARPETA / "Caja_Negra_de_Obra_Exposicion.pptx")
salida = []
for i, d in enumerate(pres.slides, 1):
    marcadores = [s for s in d.shapes if s.is_placeholder and s.has_text_frame]  # el primero es el título del diseño
    titulo = marcadores[0].text_frame.text if marcadores else ""
    notas = d.notes_slide.notes_text_frame.text if d.has_notes_slide else ""
    salida.append({"n": i, "titulo": titulo.replace("\n", " "), "notas": notas})
(CARPETA / "fuente" / "notas.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(salida), "diapositivas")
