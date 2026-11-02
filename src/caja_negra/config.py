"""Parámetros únicos del sistema: rutas, fechas de corte, plazos legales y particiones."""
import os
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]

# Datos depurados del cuaderno de obra digital (OECE). Por defecto se leen de la copia local
# del equipo; se puede apuntar a otra carpeta con la variable de entorno CAJA_NEGRA_FUENTE.
FUENTE = Path(os.environ.get("CAJA_NEGRA_FUENTE", RAIZ.parent / "PROYECTO GPS" / "data" / "curated"))
ASIENTOS_FUENTE = FUENTE / "asiento.parquet"
CUADERNOS_FUENTE = FUENTE / "cuaderno.parquet"
# Variables de contrato, plazo, SIAF e historial calculadas con corte temporal por el pipeline previo del equipo.
INDICADORES_FUENTE = FUENTE.parent / "features" / "features_structured.parquet"
AVANCE_FUENTE = FUENTE.parent / "features" / "asiento_extraccion.parquet"

TRABAJO = RAIZ / "datos"            # intermedios pesados (no se versionan)
RESULTADOS = RAIZ / "resultados"    # métricas y tablas (se versionan)
WEB_DATOS = RAIZ / "web" / "data"   # JSON que consume el prototipo
for p in (TRABAJO, RESULTADOS, WEB_DATOS):
    p.mkdir(parents=True, exist_ok=True)

AREQUIPA = "04"                      # código de departamento INEI
FIN_DATOS = pd.Timestamp("2026-08-31")   # último día con asientos publicados
SEMILLA = 20261101

# Plazos legales en días calendario (RLCE art. 193 y 143; RLGCP art. 190 y 105.3).
PLAZO_DIRECTO = 5        # el supervisor absuelve sin opinión del proyectista
PLAZO_PROYECTISTA = 21   # cadena completa: 4+2+10+5 (RLCE) = 5+1+10+5 (RLGCP)

# Evento a anticipar: primer asiento de atraso legal (valorización acumulada < 80 % de lo
# programado o calendario acelerado; RLCE art. 203, RLGCP art. 207).
TIPOS_EVENTO = ("VALORIZACION_MENOR_80", "CALENDARIO_ACELERADO")
HORIZONTE = 60

# Partición temporal por fecha de corte (el modelo nunca ve el futuro).
FIN_ENTRENAMIENTO = pd.Timestamp("2025-09-30")
FIN_VALIDACION = pd.Timestamp("2025-12-31")
FIN_PRUEBA = FIN_DATOS - pd.Timedelta(days=HORIZONTE)   # último corte con 60 días observados

# Niveles de alerta: proporción de obras marcadas en validación.
CUOTA_ALTO = 0.20
CUOTA_MEDIO = 0.30
