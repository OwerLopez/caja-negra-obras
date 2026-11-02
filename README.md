# Caja Negra de Obra

Inspector virtual que lee el cuaderno de obra digital de las obras públicas de Arequipa, detecta qué consultas
del residente están trabadas y quién debe responderlas, y avisa antes de que la obra caiga en atraso legal,
con la prueba escrita.

> Cuando un avión cae, se lee su caja negra para saber qué pasó. En una obra pública, la caja negra es el
> cuaderno de obra. Hoy se lee cuando la obra ya está atrasada; este sistema la lee mientras la obra está viva.

- **Prototipo:** https://owerlopez.github.io/caja-negra-obras/
- **Informe (estructura GESITI):** [informe/Informe_Caja_Negra_de_Obra.docx](informe/Informe_Caja_Negra_de_Obra.docx) · [PDF](informe/Informe_Caja_Negra_de_Obra.pdf)
- **Diapositivas:** [diapositivas/Caja_Negra_de_Obra.pptx](diapositivas/Caja_Negra_de_Obra.pptx) · [PDF](diapositivas/Caja_Negra_de_Obra.pdf)

Curso: Gestión de Sistemas y Tecnologías de Información, Escuela Profesional de Ingeniería de Sistemas, UNSA.

## Qué responde, por obra

| Pregunta | Cómo |
|---|---|
| ¿Se va a atrasar? | Probabilidad de atraso legal en 60 días (LightGBM calibrado), nivel y razones en palabras simples |
| ¿Quién la está trabando? | Cada consulta del residente con su veredicto según el plazo legal (5 o 21 días) y el responsable |
| ¿Qué está pasando? | Actividad del cuaderno por mes y hechos formales (suspensiones, ampliaciones, adicionales, riesgos) |

Toda afirmación muestra el asiento original del cuaderno (texto anonimizado).

## Resultados principales (prueba fuera de tiempo, Arequipa, enero a junio de 2026)

Las cifras exactas están en `resultados/*.json`.

- Emparejador consulta–respuesta: 66,8 % de acierto (IC 95 %: 62,6–71,3 %), frente a 52,0 % de la regla «la más reciente».
- Solo 37,0 % de las 6 472 consultas del residente tiene respuesta trazable en el cuaderno; 19,0 % de las respuestas llegó fuera de plazo.
- Revisando el 20 % de obras con mayor riesgo, 17,9 % cae en atraso en 60 días (7,0 % al azar); ese 20 % concentra el 51 % de los atrasos.
- Alerta alta previa en 59 % de las obras que luego se atrasaron, con una mediana de 39 días de anticipación.

## Estructura

```
scripts/      p01 a p06: pipeline reproducible; render_diagramas, capturas y medir_prototipo
src/          configuración (plazos legales, fechas de corte) y lectura del texto
resultados/   métricas versionadas y linaje de los datos OECE (URL y SHA-256)
web/          prototipo estático (HTML, CSS, JS) y sus datos JSON
diagramas/    fuentes Mermaid de los diagramas
informe/      informe Word/PDF, figuras y su generador
diapositivas/ presentación y su generador
```

## Cómo reproducir

Requiere Python 3.12 y los asientos y cuadernos del cuaderno de obra digital del OECE ya depurados en Parquet
(ruta configurable con `CAJA_NEGRA_FUENTE`; por defecto `../PROYECTO GPS/data/curated`).

```bash
pip install -r requirements.txt
python scripts/p01_preparar.py
python scripts/p02_emparejar.py        # usa GPU si hay (Sentence-BERT)
python scripts/p03_plazos_y_panel.py
python scripts/p04_modelo.py
python scripts/p05_exportar.py
python scripts/p06_figuras.py
python -m http.server 8765 --directory web
```

El informe y las diapositivas se generan con `node informe/fuente/construir.js` y
`node diapositivas/fuente/construir.js` (paquetes npm `docx` y `pptxgenjs`).

## Límites

Predice el atraso legal (avance menor al 80 % de lo programado), no la paralización. Solo cubre obras por contrata
con cuaderno digital (desde junio de 2024). No ve las respuestas enviadas por carta. Es una prioridad de revisión,
no una acusación: toda alerta debe verificarse con el expediente de la obra.

## Licencia

Código bajo licencia MIT. Los datos de origen son datos abiertos del OECE.
