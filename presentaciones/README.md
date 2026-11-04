# Presentación técnica

- `Caja_Negra_de_Obra_Exposicion.pptx` / `.pdf`: 17 diapositivas en cinco bloques, con notas del orador.
- `Guion_Exposicion.docx` / `.pdf`: distribución por integrante, tiempos (20:30), explicación oral, demostración y transiciones.

Toda cifra se lee de `resultados/*.json` y `web/data/*.json`; las capturas son del sitio publicado.

Regenerar (carpetas de `pptxgenjs`, `docx` y del skill pptx según el equipo):

```bash
PPTX_SKILL=<skill pptx> NODE_PATH=<node_modules> node presentaciones/fuente/construir.js
python presentaciones/fuente/extraer_notas.py
NODE_PATH=<node_modules> node presentaciones/fuente/guion.js
```
