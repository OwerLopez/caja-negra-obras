"""Paso 3c. Patrones descriptivos: cómo cambia cada indicador clave entre las obras-mes que luego caen en atraso legal
y las que no, y cómo cambia la tasa de atraso entre valores bajos (≤ p25) y altos (> p75) del indicador.

Solo usa cortes de entrenamiento y validación (T <= FIN_VALIDACION): la prueba no se mira.
Salida: resultados/p03c_patrones.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra.indicadores import CATALOGO, GRUPOS  # noqa: E402

CLAVE = ["dias_sin_asientos", "asientos_30d", "prop_supervisor_90d", "ampliaciones", "suspensiones", "penalidades", "alertas_90d",
         "consultas_vencidas", "max_dias_espera", "pct_respondidas_tarde", "meses_seguidos_vencidas", "plazo_consumido",
         "dias_restantes_plazo", "plazo_vs_avance", "log_monto_contratado", "devengado_sobre_viable", "meses_sin_devengado",
         "contratista_atrasos_previos", "entidad_atrasos_previos", "lluvias_en_horizonte"]

panel = pd.read_parquet(C.TRABAJO / "panel_ampliado.parquet")
panel["T"] = pd.to_datetime(panel["T"])
d = panel[panel.observable & (panel["T"] <= C.FIN_VALIDACION)]
base = float(d.y.mean())
filas = []
for v in CLAVE:
    x = d[[v, "y"]].dropna()
    if v.startswith("log_"):  # se reporta en millones de soles, no en logaritmo
        x[v] = np.expm1(x[v]) / 1e6
    p25, p75 = x[v].quantile(0.25), x[v].quantile(0.75)
    fmt = lambda t: f"{t:.0f}" if abs(t) >= 10 or t == int(t) else f"{t:.1f}" if abs(t) >= 1 else f"{t:.2f}"  # noqa: E731
    if p75 > p25:
        bajo, alto = x[x[v] <= p25], x[x[v] > p75] if (x[v] > p75).any() else x[x[v] >= p75]
        corte = f"≤ {fmt(p25)} frente a > {fmt(p75)}"
    else:  # mayoría de ceros u otro valor repetido: se compara ese valor frente al resto
        bajo, alto = x[x[v] <= p25], x[x[v] > p25]
        corte = f"{fmt(p25)} frente a > {fmt(p25)}"
    filas.append({"variable": v, "unidad": "S/ millones" if v.startswith("log_") else "", "grupo": GRUPOS[CATALOGO[v][0]], "cobertura_pct": round(100 * len(x) / len(d), 1),
                  "mediana_con_atraso": round(float(x[x.y == 1][v].median()), 3),
                  "mediana_sin_atraso": round(float(x[x.y == 0][v].median()), 3),
                  "tasa_bajo": round(float(bajo.y.mean()), 4), "tasa_alto": round(float(alto.y.mean()), 4),
                  "razon_alto_bajo": round(float(alto.y.mean() / max(bajo.y.mean(), 1e-9)), 2), "comparacion": corte, "filas_bajo": int(len(bajo)), "filas_alto": int(len(alto))})
out = {"filas": int(len(d)), "obras": int(d.cuaderno_id.nunique()), "positivos": int(d.y.sum()), "tasa_base": round(base, 4),
       "hasta": str(C.FIN_VALIDACION.date()), "patrones": filas}
(C.RESULTADOS / "p03c_patrones.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
for f in filas:
    print(f"{f['variable']:28s} cob {f['cobertura_pct']:5.1f}  med1 {f['mediana_con_atraso']:9.3f} med0 {f['mediana_sin_atraso']:9.3f}  "
          f"tasa {f['tasa_bajo']:.3f} -> {f['tasa_alto']:.3f}  x{f['razon_alto_bajo']}")
print("base", base, out["filas"], out["positivos"])
