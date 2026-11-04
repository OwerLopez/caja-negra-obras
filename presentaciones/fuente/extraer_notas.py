"""Extrae título y notas del orador de cada diapositiva de una presentación, para su guion.

Requiere python-pptx. Uso: python presentaciones/fuente/extraer_notas.py <presentación.pptx> <salida.json>
Sin argumentos usa la exposición de presentaciones/.
"""
import json
import sys
from pathlib import Path

from pptx import Presentation

CARPETA = Path(__file__).resolve().parents[1]
entrada = Path(sys.argv[1]) if len(sys.argv) > 1 else CARPETA / "Caja_Negra_de_Obra_Exposicion.pptx"
destino = Path(sys.argv[2]) if len(sys.argv) > 2 else CARPETA / "fuente" / "notas.json"
salida = []
for i, d in enumerate(Presentation(entrada).slides, 1):
    marcadores = [s for s in d.shapes if s.is_placeholder and s.has_text_frame]  # el primero es el título del diseño
    titulo = marcadores[0].text_frame.text if marcadores else ""
    notas = d.notes_slide.notes_text_frame.text if d.has_notes_slide else ""
    salida.append({"n": i, "titulo": titulo.replace("\n", " "), "notas": notas})
destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(salida), "diapositivas ->", destino)
