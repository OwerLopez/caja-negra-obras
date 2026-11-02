"""Paso 3. Motor de plazos (quién traba) y panel obra-mes con lo que se sabía en cada fecha de corte.

Motor de plazos: para cada consulta del residente (RLCE art. 193 / RLGCP art. 190) toma la primera
respuesta enlazada, cuenta días calendario y compara con el plazo legal: 5 días si la absuelve el
supervisor, 21 si interviene la entidad y el proyectista.

Panel: una fila por obra y fin de mes (T). Variables calculadas solo con asientos de fecha <= T y
respuestas conocidas hasta T. Etiqueta: primer asiento de atraso legal dentro de (T, T+60].

Salida: datos/consultas_auditadas.parquet, datos/panel.parquet, resultados/p03_plazos.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import duckdb  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
A, K = (C.TRABAJO / "asientos.parquet").as_posix(), (C.TRABAJO / "cuadernos.parquet").as_posix()
cuad = con.sql(f"select * from '{K}'").df()
for c in ("primer_asiento", "ultimo_asiento", "f_fin_obra", "f_evento"):
    cuad[c] = pd.to_datetime(cuad[c])

# ---------------- motor de plazos ----------------
cons = con.sql(f"""select cuaderno_id, nro_asiento nro_c, fecha f_c from '{A}'
                   where tipo_std = 'CONSULTAS' and rol = 'SOEC_RESI'""").df().drop_duplicates(["cuaderno_id", "nro_c"])
cons["f_c"] = pd.to_datetime(cons.f_c)
P = pd.read_parquet(C.TRABAJO / "pares.parquet")
P["f_r"] = pd.to_datetime(P.f_r)
P = P.sort_values(["f_r", "nro_r"]).drop_duplicates(["cuaderno_id", "nro_c"])     # primera respuesta enlazada
Q = cons.merge(P[["cuaderno_id", "nro_c", "nro_r", "f_r", "rol_r", "metodo", "confianza", "ruta_proyectista"]],
               on=["cuaderno_id", "nro_c"], how="left")
Q["ruta_proyectista"] = Q.ruta_proyectista.fillna(False).astype(bool)
Q["plazo"] = np.where(Q.ruta_proyectista, C.PLAZO_PROYECTISTA, C.PLAZO_DIRECTO)
Q["dias_respuesta"] = (Q.f_r - Q.f_c).dt.days
Q["responsable"] = np.where(Q.ruta_proyectista, "Entidad y proyectista", "Supervisor o inspector")
Q = Q.merge(cuad[["cuaderno_id", "dep_code"]], on="cuaderno_id", how="left")


def veredicto(q, corte):
    """Estado de una consulta vista en la fecha de corte."""
    respondida = q.f_r.notna() & (q.f_r <= corte)
    dias = np.where(respondida, (q.f_r - q.f_c).dt.days, (corte - q.f_c).dt.days)
    return np.select([respondida & (dias <= q.plazo), respondida, dias <= q.plazo],
                     ["A tiempo", "Tarde", "En plazo"], "Sin respuesta en el cuaderno"), dias


Q["veredicto"], Q["dias_al_corte"] = veredicto(Q, C.FIN_DATOS)
Q.to_parquet(C.TRABAJO / "consultas_auditadas.parquet", index=False)


def resumen(q):
    r = q[q.f_r.notna()]
    return {"consultas_residente": int(len(q)),
            "veredicto": q.veredicto.value_counts().to_dict(),
            "respondidas_enlazadas": int(len(r)),
            "pct_respondidas_enlazadas": round(100 * len(r) / max(len(q), 1), 1),
            "dias_respuesta": {"mediana": float(r.dias_respuesta.median()), "p75": float(r.dias_respuesta.quantile(.75)),
                               "p90": float(r.dias_respuesta.quantile(.9))},
            "pct_tarde_entre_respondidas": round(100 * (r.dias_respuesta > r.plazo).mean(), 1),
            "por_ruta": q.groupby("responsable").veredicto.value_counts().unstack(fill_value=0).to_dict("index"),
            "por_metodo_enlace": r.metodo.value_counts().to_dict(),
            "histograma_dias": np.histogram(r.dias_respuesta.clip(0, 60), bins=[0, 1, 3, 6, 11, 16, 22, 31, 61])[0].tolist()}


out = {"plazos": {"directo": C.PLAZO_DIRECTO, "con_proyectista": C.PLAZO_PROYECTISTA},
       "corte": str(C.FIN_DATOS.date()),
       "arequipa": resumen(Q[Q.dep_code == C.AREQUIPA]), "nacional": resumen(Q)}

# ---------------- panel obra-mes ----------------
base = cuad[cuad.historia_completa.fillna(False)].copy()
filas = []
for r in base.itertuples():
    ini = r.primer_asiento + pd.offsets.MonthEnd(0)
    fin = min([x for x in (r.f_evento, r.f_fin_obra, C.FIN_DATOS) if pd.notna(x)])
    for T in pd.date_range(ini, fin, freq="ME"):
        if pd.notna(r.f_evento) and T >= r.f_evento:
            break
        filas.append((r.cuaderno_id, T))
panel = pd.DataFrame(filas, columns=["cuaderno_id", "T"]).merge(
    base[["cuaderno_id", "dep_code", "f_evento", "primer_asiento"]], on="cuaderno_id")
dif = (panel.f_evento - panel["T"]).dt.days
panel["y"] = ((dif > 0) & (dif <= C.HORIZONTE)).astype(int)
panel["observable"] = (panel["T"] + pd.Timedelta(days=C.HORIZONTE) <= C.FIN_DATOS) | (panel.y == 1)
print(f"panel: {len(panel):,} filas, {panel.cuaderno_id.nunique():,} obras")

# Conteos acumulados por tipo de asiento hasta T (asientos de fecha <= T).
con.register("panel", panel[["cuaderno_id", "T"]])
TIPOS = {"suspensiones": "SUSPENSION_PLAZO", "ampliaciones": "AMPLIACION_PLAZO", "adicionales": "ADICIONALES",
         "mayores_metrados": "MAYORES_METRADOS", "riesgos": "RIESGOS", "penalidades": "PENALIDADES",
         "ordenes": "ORDENES", "valorizaciones": "VALORIZACIONES", "cambio_personal": "PERSONAL_CLAVE"}
sel = ",\n".join(f"count(*) filter (where a.tipo_std = '{t}') {n}" for n, t in TIPOS.items())
X = con.sql(f"""
  select p.cuaderno_id, p.T,
         count(*) filter (where a.fecha > p.T::date - 30) asientos_30d,
         count(*) filter (where a.fecha > p.T::date - 90) asientos_90d,
         count(*) asientos_total,
         date_diff('day', max(a.fecha), p.T::date) dias_sin_asientos,
         count(*) filter (where a.fecha > p.T::date - 90 and a.rol = 'SOEC_SPV') / greatest(count(*) filter (where a.fecha > p.T::date - 90), 1) prop_supervisor_90d,
         count(*) filter (where a.tipo_std in ('SUSPENSION_PLAZO','AMPLIACION_PLAZO','RIESGOS') and a.fecha > p.T::date - 90) alertas_90d,
         {sel}
  from panel p join '{A}' a on a.cuaderno_id = p.cuaderno_id and a.fecha <= p.T::date
  group by 1, 2""").df()

# Variables del motor de plazos vistas en T (solo respuestas conocidas hasta T).
Qp = Q[["cuaderno_id", "f_c", "f_r", "plazo"]]
con.register("q", Qp)
Y = con.sql("""
  select p.cuaderno_id, p.T,
         count(*) consultas,
         count(*) filter (where q.f_c > p.T - interval 90 day) consultas_90d,
         count(*) filter (where (q.f_r is null or q.f_r > p.T) and date_diff('day', q.f_c, p.T) > q.plazo) consultas_vencidas,
         count(*) filter (where (q.f_r is null or q.f_r > p.T) and date_diff('day', q.f_c, p.T) <= q.plazo) consultas_en_plazo,
         coalesce(max(date_diff('day', q.f_c, p.T)) filter (where q.f_r is null or q.f_r > p.T), 0) max_dias_espera,
         count(*) filter (where q.f_r <= p.T and date_diff('day', q.f_c, q.f_r) > q.plazo) respondidas_tarde,
         count(*) filter (where q.f_r <= p.T) respondidas,
         coalesce(median(date_diff('day', q.f_c, q.f_r)) filter (where q.f_r <= p.T), -1) mediana_dias_respuesta
  from panel p join q on q.cuaderno_id = p.cuaderno_id and q.f_c <= p.T
  group by 1, 2""").df()
panel = panel.merge(X, on=["cuaderno_id", "T"], how="left").merge(Y, on=["cuaderno_id", "T"], how="left")
num = [c for c in panel.columns if c not in ("cuaderno_id", "T", "dep_code", "f_evento", "primer_asiento", "y", "observable")]
panel[num] = panel[num].fillna(0)
panel.loc[panel.respondidas == 0, "mediana_dias_respuesta"] = -1
panel["pct_respondidas_tarde"] = np.where(panel.respondidas > 0, panel.respondidas_tarde / panel.respondidas.clip(lower=1), 0)
panel["meses_desde_inicio"] = ((panel["T"] - panel.primer_asiento).dt.days / 30.4).round(1)
panel.drop(columns=["primer_asiento"]).to_parquet(C.TRABAJO / "panel.parquet", index=False)

obs = panel[panel.observable]
out["panel"] = {"filas": int(len(panel)), "obras": int(panel.cuaderno_id.nunique()),
                "filas_observables": int(len(obs)), "positivos": int(obs.y.sum()),
                "prevalencia": round(float(obs.y.mean()), 4),
                "arequipa": {"filas_observables": int((obs.dep_code == C.AREQUIPA).sum()),
                             "positivos": int(obs[obs.dep_code == C.AREQUIPA].y.sum()),
                             "obras": int(panel[panel.dep_code == C.AREQUIPA].cuaderno_id.nunique())}}
(C.RESULTADOS / "p03_plazos.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=1, default=str))
