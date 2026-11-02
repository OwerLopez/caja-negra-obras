"""Paso 3b. Amplía el panel obra-mes con indicadores de plazo, avance, contrato, ejecución financiera,
historial de actores, persistencia y calendario.

- Contrato, plazo original, SIAF, seguimiento MEF e historial: tabla de variables con corte temporal del
  pipeline previo del equipo (features_structured.parquet, una fila por obra y fin de mes T). De INFOBRAS solo
  se usan datos fijos del contrato (plazo y fechas originales), nunca el avance actual de la foto.
- Avance físico: porcentajes leídos del texto de los asientos de valorización con fecha <= T (se excluyen los
  asientos que son la propia etiqueta).
- Persistencia y calendario: calculados aquí.

Salida: datos/panel_ampliado.parquet, resultados/p03b_indicadores.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra.indicadores import CATALOGO, CATEGORICAS, GRUPOS  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
panel = pd.read_parquet(C.TRABAJO / "panel.parquet")
panel["T"] = pd.to_datetime(panel["T"])
panel = panel.rename(columns={})

# ---------------- variables con corte temporal del pipeline previo ----------------
MAPA = {"asi_ritmo_30d_vs_90d": "ritmo_30_vs_90", "asi_dias_desde_inicio_plazo": "dias_desde_inicio_plazo",
        "ib_plazo_original_dias": "plazo_contractual_dias", "ib_frac_plazo_transcurrido": "plazo_consumido",
        "ib_dias_para_fin_programado": "dias_restantes_plazo", "est_log_monto_contratado": "log_monto_contratado",
        "est_log_monto_viable": "log_monto_viable", "est_es_consorcio": "es_consorcio", "est_regimen_ley32069": "regimen_ley32069",
        "est_nivel_gobierno": "nivel_gobierno", "est_tipo_entidad": "tipo_entidad", "est_sector": "sector",
        "siaf_dev_acum_sobre_viable": "devengado_sobre_viable", "siaf_dev_3m": "devengado_3m",
        "siaf_meses_desde_ultimo_dev": "meses_sin_devengado", "mefseg_problemas_180d": "problemas_mef_180d",
        "actor_contratista_obras_previas": "contratista_obras_previas", "actor_contratista_atrasos_previos": "contratista_atrasos_previos",
        "actor_entidad_obras_previas": "entidad_obras_previas", "actor_entidad_atrasos_previos": "entidad_atrasos_previos"}
ext = pd.read_parquet(C.INDICADORES_FUENTE, columns=["cuaderno_id", "T", *MAPA]).rename(columns=MAPA)
ext["T"] = pd.to_datetime(ext["T"])
for c in ext.columns:
    if c not in ("cuaderno_id", "T", *CATEGORICAS):
        ext[c] = pd.to_numeric(ext[c], errors="coerce").astype(float)
panel = panel.merge(ext, on=["cuaderno_id", "T"], how="left")

# ---------------- avance físico leído del texto (as-of) ----------------
av = pd.read_parquet(C.AVANCE_FUENTE)
av = av[~av.tipo_std.isin(C.TIPOS_EVENTO)].copy()
av["fecha"] = pd.to_datetime(av.fecha)
av = av.sort_values("fecha")
filas = panel[["cuaderno_id", "T"]].sort_values("T")
ejec = pd.merge_asof(filas, av[av.ie_ejec.notna()][["cuaderno_id", "fecha", "ie_ejec"]].rename(columns={"fecha": "T"}),
                     on="T", by="cuaderno_id", direction="backward")
brecha = pd.merge_asof(filas, av[av.ie_brecha.notna()][["cuaderno_id", "fecha", "ie_brecha"]].rename(columns={"fecha": "T"}),
                       on="T", by="cuaderno_id", direction="backward")
panel = panel.merge(ejec.rename(columns={"ie_ejec": "avance_reportado"}), on=["cuaderno_id", "T"], how="left")
panel = panel.merge(brecha.rename(columns={"ie_brecha": "brecha_reportada"}), on=["cuaderno_id", "T"], how="left")
panel["avance_reportado"] = panel.avance_reportado.clip(0, 150)
panel["plazo_vs_avance"] = 100 * panel.plazo_consumido - panel.avance_reportado

# ---------------- persistencia ----------------
panel = panel.sort_values(["cuaderno_id", "T"]).reset_index(drop=True)
hay = (panel.consultas_vencidas > 0).astype(int)
bloque = (hay != hay.groupby(panel.cuaderno_id).shift()).cumsum()
panel["meses_seguidos_vencidas"] = hay.groupby([panel.cuaderno_id, bloque]).cumsum() * hay

# ---------------- calendario ----------------
mes = panel["T"].dt.month
panel["mes_sen"] = np.sin(2 * np.pi * mes / 12)
panel["mes_cos"] = np.cos(2 * np.pi * mes / 12)
panel["lluvias_en_horizonte"] = mes.isin([11, 12, 1, 2]).astype(int)
panel["cierre_fiscal"] = mes.isin([10, 11]).astype(int)

for c in CATEGORICAS:
    panel[c] = panel[c].astype("category")
faltan = [k for k in CATALOGO if k not in panel.columns]
assert not faltan, faltan
panel.to_parquet(C.TRABAJO / "panel_ampliado.parquet", index=False)

obs = panel[panel.observable]
cob = {}
for amb, d in (("nacional", obs), ("arequipa", obs[obs.dep_code == C.AREQUIPA])):
    cob[amb] = {k: round(100 * float(d[k].notna().mean()), 1) for k in CATALOGO}
out = {"filas": int(len(panel)), "indicadores": len(CATALOGO),
       "por_grupo": {g: sum(1 for v in CATALOGO.values() if v[0] == g) for g in GRUPOS},
       "cobertura_pct": cob,
       "descriptivos_arequipa": obs[obs.dep_code == C.AREQUIPA][[k for k in CATALOGO if k not in CATEGORICAS]]
       .describe().T[["mean", "50%"]].round(3).to_dict("index")}
(C.RESULTADOS / "p03b_indicadores.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({k: out[k] for k in ("filas", "indicadores", "por_grupo")}, ensure_ascii=False))
print({k: v for k, v in cob["arequipa"].items() if v < 100})
