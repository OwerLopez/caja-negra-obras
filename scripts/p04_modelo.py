"""Paso 4. Predictor de atraso a 60 días y su evaluación honesta.

Compara, con la misma partición temporal (entrenar en el pasado, probar en el futuro):
  B0 tasa base (azar informado) · B1 regla simple (más consultas vencidas = más riesgo)
  B2 regresión logística · B3 LightGBM sin las variables de consultas · M LightGBM completo.
Los LightGBM detienen su entrenamiento con el conjunto de validación (nunca con la prueba) y M se calibra
con un ajuste logístico (Platt) en validación para que sus probabilidades signifiquen lo que dicen; el ajuste
es monótono, así que no cambia el orden de las obras.

Salida: datos/modelo.txt, datos/predicciones.parquet, resultados/p04_modelo.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

from caja_negra import config as C  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
rng = np.random.default_rng(C.SEMILLA)

VAR_BASE = ["asientos_30d", "asientos_90d", "asientos_total", "dias_sin_asientos", "prop_supervisor_90d", "alertas_90d",
            "suspensiones", "ampliaciones", "adicionales", "mayores_metrados", "riesgos", "penalidades", "ordenes",
            "valorizaciones", "cambio_personal", "meses_desde_inicio"]
VAR_CONSULTAS = ["consultas", "consultas_90d", "consultas_vencidas", "consultas_en_plazo", "max_dias_espera",
                 "respondidas_tarde", "respondidas", "mediana_dias_respuesta", "pct_respondidas_tarde"]
VARS = VAR_BASE + VAR_CONSULTAS

panel = pd.read_parquet(C.TRABAJO / "panel.parquet")
panel["T"] = pd.to_datetime(panel["T"])
obs = panel[panel.observable]
tr = obs[obs["T"] <= C.FIN_ENTRENAMIENTO]
va = obs[(obs["T"] > C.FIN_ENTRENAMIENTO) & (obs["T"] <= C.FIN_VALIDACION)]
te = obs[(obs["T"] > C.FIN_VALIDACION) & (obs["T"] <= C.FIN_PRUEBA)].copy()
print({n: (len(d), int(d.y.sum())) for n, d in (("entrenamiento", tr), ("validacion", va), ("prueba", te))})


def lgbm(vars_):
    m = lgb.LGBMClassifier(n_estimators=3000, learning_rate=0.02, num_leaves=15, min_child_samples=100,
                           subsample=0.8, subsample_freq=1, colsample_bytree=0.7, reg_lambda=5.0,
                           random_state=C.SEMILLA, verbose=-1)
    return m.fit(tr[vars_], tr.y, eval_set=[(va[vars_], va.y)], eval_metric="average_precision",
                 callbacks=[lgb.early_stopping(200, first_metric_only=True, verbose=False)])


m_base = lgbm(VAR_BASE)
m_full = lgbm(VARS)
logit = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, C=0.5)).fit(np.log1p(tr[VARS].clip(lower=0)), tr.y)


def _z(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p)).reshape(-1, 1)


platt = LogisticRegression(C=1e6).fit(_z(m_full.predict_proba(va[VARS])[:, 1]), va.y)


class Calibrado:
    def predict(self, p):
        return platt.predict_proba(_z(p))[:, 1]


iso = Calibrado()


def puntajes(d):
    return {
        "B0 Tasa base": np.full(len(d), tr.y.mean()),
        "B1 Regla: consultas vencidas": d.consultas_vencidas.values + 1e-3 * d.max_dias_espera.values,
        "B2 Regresión logística": logit.predict_proba(np.log1p(d[VARS].clip(lower=0)))[:, 1],
        "B3 LightGBM sin consultas": m_base.predict_proba(d[VAR_BASE])[:, 1],
        "M Caja Negra (LightGBM + consultas)": iso.predict(m_full.predict_proba(d[VARS])[:, 1]),
    }


def top_k(y, s, k=0.2):
    n = max(int(round(k * len(y))), 1)
    desempate = np.random.default_rng(C.SEMILLA).random(len(s)) * 1e-9
    idx = np.argsort(-(s + desempate), kind="stable")[:n]
    return y[idx].sum() / n, y[idx].sum() / max(y.sum(), 1)


def metricas(y, s, calibrado):
    p20, r20 = top_k(y, s)
    m = {"pr_auc": average_precision_score(y, s), "roc_auc": roc_auc_score(y, s),
         "precision_top20": p20, "recall_top20": r20, "lift_top20": p20 / y.mean()}
    if calibrado:
        m["brier"] = brier_score_loss(y, s)
    return m


def bootstrap(d, s, n=1000):
    cs = d.cuaderno_id.values
    u, inv = np.unique(cs, return_inverse=True)
    grupos = [np.where(inv == i)[0] for i in range(len(u))]
    res = []
    for _ in range(n):
        idx = np.concatenate([grupos[i] for i in rng.integers(0, len(u), len(u))])
        y = d.y.values[idx]
        if 0 < y.sum() < len(y):
            res.append({k: average_precision_score(y, v[idx]) for k, v in s.items()} |
                       {k + "|roc": roc_auc_score(y, v[idx]) for k, v in s.items()})
    return pd.DataFrame(res)


out = {"particion": {n: {"filas": int(len(d)), "positivos": int(d.y.sum()), "obras": int(d.cuaderno_id.nunique()),
                         "desde": str(d["T"].min().date()), "hasta": str(d["T"].max().date())}
                     for n, d in (("entrenamiento", tr), ("validacion", va), ("prueba", te))},
       "variables": {"base": VAR_BASE, "consultas": VAR_CONSULTAS}, "resultados": {}}
for ambito, d in (("arequipa", te[te.dep_code == C.AREQUIPA]), ("nacional", te)):
    s = puntajes(d)
    y = d.y.values
    res = {k: {m: round(float(v), 4) for m, v in metricas(y, v, k.startswith(("B0", "B2", "M"))).items()} for k, v in s.items()}
    B = bootstrap(d, s)
    for k in s:
        res[k]["pr_auc_ic95"] = [round(float(B[k].quantile(q)), 4) for q in (0.025, 0.975)]
        res[k]["roc_auc_ic95"] = [round(float(B[k + "|roc"].quantile(q)), 4) for q in (0.025, 0.975)]
    dif = B["M Caja Negra (LightGBM + consultas)"] - B["B3 LightGBM sin consultas"]
    pares = {}
    for k in s:
        if k.startswith("M"):
            continue
        dd = B["M Caja Negra (LightGBM + consultas)"] - B[k]
        pares[k] = {"diferencia_pr_auc": round(float(dd.mean()), 4), "ic95": [round(float(dd.quantile(q)), 4) for q in (0.025, 0.975)],
                    "p_unilateral": round(float((dd <= 0).mean()), 4)}
    out["resultados"][ambito] = {
        "filas": int(len(d)), "positivos": int(y.sum()), "obras": int(d.cuaderno_id.nunique()),
        "prevalencia": round(float(y.mean()), 4), "modelos": res,
        "comparacion_pareada_M_vs": pares,
        "aporte_consultas_pr_auc": {"diferencia": round(float(dif.mean()), 4),
                                    "ic95": [round(float(dif.quantile(q)), 4) for q in (0.025, 0.975)],
                                    "p_unilateral": round(float((dif <= 0).mean()), 4)}}

# ---------------- niveles de alerta y anticipación ----------------
pv = iso.predict(m_full.predict_proba(va[VARS])[:, 1])
u_alto = float(np.quantile(pv, 1 - C.CUOTA_ALTO))
u_medio = float(np.quantile(pv, 1 - C.CUOTA_ALTO - C.CUOTA_MEDIO))
if u_medio >= u_alto:
    u_medio = float(np.unique(pv)[np.unique(pv) < u_alto].max())


def nivel(p):
    return np.where(p >= u_alto, "ALTO", np.where(p >= u_medio, "MEDIO", "BAJO"))


te["p"] = iso.predict(m_full.predict_proba(te[VARS])[:, 1])
te["nivel"] = nivel(te.p)
out["niveles"] = {"umbral_alto": round(u_alto, 4), "umbral_medio": round(u_medio, 4)}
for ambito, d in (("arequipa", te[te.dep_code == C.AREQUIPA]), ("nacional", te)):
    g = d.groupby("nivel").agg(filas=("y", "size"), eventos=("y", "sum"), tasa_observada=("y", "mean"), prob_media=("p", "mean"))
    out["niveles"][ambito] = g.round(4).reset_index().to_dict("records")
# Calibración por deciles (nacional; Arequipa tiene pocos eventos para deciles estables).
te["decil"] = pd.qcut(te.p.rank(method="first"), 10, labels=False)
out["calibracion_nacional"] = te.groupby("decil").agg(prob_media=("p", "mean"), tasa_observada=("y", "mean"),
                                                      filas=("y", "size")).round(4).reset_index().to_dict("records")

# Anticipación: obras cuyo primer atraso cae dentro del periodo de prueba; ¿hubo alerta ALTO antes?
todos = panel[(panel["T"] > C.FIN_VALIDACION)].copy()
todos["p"] = iso.predict(m_full.predict_proba(todos[VARS])[:, 1])
todos["nivel"] = nivel(todos.p)
ev = todos[todos.f_evento.notna() & (pd.to_datetime(todos.f_evento) > C.FIN_VALIDACION) & (pd.to_datetime(todos.f_evento) <= C.FIN_DATOS)]
ant = []
for c, g in ev.groupby("cuaderno_id"):
    f = pd.to_datetime(g.f_evento.iloc[0])
    a = g[(g.nivel == "ALTO") & ((f - g["T"]).dt.days <= 120)]
    ant.append({"cuaderno_id": c, "dep": g.dep_code.iloc[0], "alertada": len(a) > 0,
                "dias_anticipacion": int((f - a["T"].min()).days) if len(a) else None})
ant = pd.DataFrame(ant)
for ambito, d in (("arequipa", ant[ant.dep == C.AREQUIPA]), ("nacional", ant)):
    a = d[d.alertada]
    out.setdefault("anticipacion", {})[ambito] = {
        "obras_con_evento": int(len(d)), "alertadas_antes": int(len(a)),
        "pct_alertadas": round(100 * len(a) / max(len(d), 1), 1),
        "dias_anticipacion_mediana": float(a.dias_anticipacion.median()) if len(a) else None,
        "dias_anticipacion_p25_p75": [float(a.dias_anticipacion.quantile(.25)), float(a.dias_anticipacion.quantile(.75))] if len(a) else None}

# Importancia (ganancia) y guardado.
imp = pd.Series(m_full.booster_.feature_importance("gain"), index=VARS).sort_values(ascending=False)
out["importancia"] = (100 * imp / imp.sum()).round(1).to_dict()
m_full.booster_.save_model(str(C.TRABAJO / "modelo.txt"))
import joblib  # noqa: E402
joblib.dump({"platt": platt, "umbral_alto": u_alto, "umbral_medio": u_medio, "vars": VARS}, C.TRABAJO / "calibrador.joblib")
out["arboles"] = {"M": int(m_full.best_iteration_), "B3": int(m_base.best_iteration_)}
te[["cuaderno_id", "T", "dep_code", "y", "p", "nivel"]].to_parquet(C.TRABAJO / "predicciones_prueba.parquet", index=False)
(C.RESULTADOS / "p04_modelo.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=1))
