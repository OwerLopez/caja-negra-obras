"""Paso 4. Predictor de atraso legal a 60 días: comparadores, modelo final, ablación por grupo y métricas.

Modelos (misma partición temporal; entrenar en el pasado, probar en el futuro):
  B0 tasa base · B1 regla (más consultas vencidas = más riesgo) · B2 regresión logística (todas las numéricas)
  B3 LightGBM solo con el cuaderno (actividad + señales) · M1 B3 + consultas y plazos
  M2 los 8 grupos de indicadores.
El modelo final («Caja Negra») es el de mejor PR-AUC en validación entre M1 y M2. Los LightGBM se detienen con
validación y el final se calibra con Platt (monótono: no cambia el orden). La prueba se usa una sola vez.

Salida: datos/modelo.txt, datos/calibrador.joblib, datos/predicciones_prueba.parquet, resultados/p04_modelo.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import joblib  # noqa: E402
import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra.indicadores import CATALOGO, CATEGORICAS, GRUPOS, por_grupo  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
rng = np.random.default_rng(C.SEMILLA)
TODOS = list(GRUPOS)
V_CUADERNO = por_grupo(["actividad", "senales"])
V_M1 = por_grupo(["actividad", "senales", "consultas"])
V_M2 = por_grupo(TODOS)
NUMERICAS = [v for v in V_M2 if v not in CATEGORICAS]

panel = pd.read_parquet(C.TRABAJO / "panel_ampliado.parquet")
panel["T"] = pd.to_datetime(panel["T"])
obs = panel[panel.observable]
tr = obs[obs["T"] <= C.FIN_ENTRENAMIENTO]
va = obs[(obs["T"] > C.FIN_ENTRENAMIENTO) & (obs["T"] <= C.FIN_VALIDACION)]
te = obs[(obs["T"] > C.FIN_VALIDACION) & (obs["T"] <= C.FIN_PRUEBA)].copy()


def lgbm(vars_):
    m = lgb.LGBMClassifier(n_estimators=3000, learning_rate=0.02, num_leaves=15, min_child_samples=100,
                           subsample=0.8, subsample_freq=1, colsample_bytree=0.7, reg_lambda=5.0,
                           random_state=C.SEMILLA, verbose=-1)
    return m.fit(tr[vars_], tr.y, eval_set=[(va[vars_], va.y)], eval_metric="average_precision",
                 callbacks=[lgb.early_stopping(200, first_metric_only=True, verbose=False)])


def ap_val(m, vars_):
    return average_precision_score(va.y, m.predict_proba(va[vars_])[:, 1])


m_cuad, m1, m2 = lgbm(V_CUADERNO), lgbm(V_M1), lgbm(V_M2)
val = {"B3": ap_val(m_cuad, V_CUADERNO), "M1": ap_val(m1, V_M1), "M2": ap_val(m2, V_M2)}
final, V_FINAL = (m2, V_M2) if val["M2"] >= val["M1"] else (m1, V_M1)
nombre_final = "M2" if final is m2 else "M1"


def _x(d):
    x = np.log1p(d[NUMERICAS].clip(lower=0).fillna(0))
    return x.assign(**{f"falta_{c}": d[c].isna().astype(int) for c in NUMERICAS})


logit = make_pipeline(StandardScaler(), LogisticRegression(max_iter=3000, C=0.5)).fit(_x(tr), tr.y)


def _z(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p)).reshape(-1, 1)


platt = LogisticRegression(C=1e6).fit(_z(final.predict_proba(va[V_FINAL])[:, 1]), va.y)


def calibrar(p):
    return platt.predict_proba(_z(p))[:, 1]


NOMBRES = {"B0": "B0 Tasa base", "B1": "B1 Regla: consultas vencidas", "B2": "B2 Regresión logística",
           "B3": "B3 LightGBM solo cuaderno", "M1": "M1 LightGBM cuaderno + consultas", "M": "M Caja Negra"}
M = NOMBRES["M"]


def puntajes(d):
    s = {NOMBRES["B0"]: np.full(len(d), tr.y.mean()),
         NOMBRES["B1"]: d.consultas_vencidas.values + 1e-3 * d.max_dias_espera.values,
         NOMBRES["B2"]: logit.predict_proba(_x(d))[:, 1],
         NOMBRES["B3"]: m_cuad.predict_proba(d[V_CUADERNO])[:, 1]}
    if nombre_final == "M2":
        s[NOMBRES["M1"]] = m1.predict_proba(d[V_M1])[:, 1]
    s[M] = calibrar(final.predict_proba(d[V_FINAL])[:, 1])
    return s


def top_k(y, s, k=0.2):
    n = max(int(round(k * len(y))), 1)
    idx = np.argsort(-(s + np.random.default_rng(C.SEMILLA).random(len(s)) * 1e-9), kind="stable")[:n]
    return y[idx].sum() / n, y[idx].sum() / max(y.sum(), 1)


def metricas(y, s, prob):
    p20, r20 = top_k(y, s)
    m = {"pr_auc": average_precision_score(y, s), "roc_auc": roc_auc_score(y, s), "precision_top20": p20,
         "recall_top20": r20, "lift_top20": p20 / y.mean()}
    if prob:
        m["brier"] = brier_score_loss(y, s)
    return {k: round(float(v), 4) for k, v in m.items()}


def bootstrap(d, s, n=1000):
    u, inv = np.unique(d.cuaderno_id.values, return_inverse=True)
    grupos = [np.where(inv == i)[0] for i in range(len(u))]
    res = []
    for _ in range(n):
        idx = np.concatenate([grupos[i] for i in rng.integers(0, len(u), len(u))])
        y = d.y.values[idx]
        if 0 < y.sum() < len(y):
            res.append({k: average_precision_score(y, v[idx]) for k, v in s.items()}
                       | {k + "|roc": roc_auc_score(y, v[idx]) for k, v in s.items()})
    return pd.DataFrame(res)


out = {"particion": {n: {"filas": int(len(d)), "positivos": int(d.y.sum()), "obras": int(d.cuaderno_id.nunique()),
                         "desde": str(d["T"].min().date()), "hasta": str(d["T"].max().date())}
                     for n, d in (("entrenamiento", tr), ("validacion", va), ("prueba", te))},
       "variables": {"cuaderno": V_CUADERNO, "m1": V_M1, "m2": V_M2, "final": V_FINAL},
       "seleccion": {"pr_auc_validacion": {k: round(float(v), 4) for k, v in val.items()}, "modelo_final": nombre_final},
       "arboles": {"final": int(final.best_iteration_), "B3": int(m_cuad.best_iteration_)}, "resultados": {}}
for amb, d in (("arequipa", te[te.dep_code == C.AREQUIPA]), ("nacional", te)):
    s = puntajes(d)
    y = d.y.values
    res = {k: metricas(y, v, k.startswith(("B0", "B2", "M "))) for k, v in s.items()}
    B = bootstrap(d, s)
    for k in s:
        res[k]["pr_auc_ic95"] = [round(float(B[k].quantile(q)), 4) for q in (0.025, 0.975)]
        res[k]["roc_auc_ic95"] = [round(float(B[k + "|roc"].quantile(q)), 4) for q in (0.025, 0.975)]
    pares = {}
    for k in s:
        if k != M:
            dd = B[M] - B[k]
            pares[k] = {"diferencia_pr_auc": round(float(dd.mean()), 4), "ic95": [round(float(dd.quantile(q)), 4) for q in (0.025, 0.975)],
                        "p_unilateral": round(float((dd <= 0).mean()), 4)}
    out["resultados"][amb] = {"filas": int(len(d)), "positivos": int(y.sum()), "obras": int(d.cuaderno_id.nunique()),
                              "prevalencia": round(float(y.mean()), 4), "modelos": res, "comparacion_pareada": pares}

# ---------------- ablación: quitar un grupo a la vez del modelo de 8 grupos ----------------
aqp = te[te.dep_code == C.AREQUIPA]
base = {"validacion": val["M2"], "arequipa": average_precision_score(aqp.y, m2.predict_proba(aqp[V_M2])[:, 1]),
        "nacional": average_precision_score(te.y, m2.predict_proba(te[V_M2])[:, 1])}
abl = {}
for g in TODOS:
    vs = [v for v in V_M2 if CATALOGO[v][0] != g]
    mg = lgbm(vs)
    r = {"validacion": ap_val(mg, vs), "arequipa": average_precision_score(aqp.y, mg.predict_proba(aqp[vs])[:, 1]),
         "nacional": average_precision_score(te.y, mg.predict_proba(te[vs])[:, 1])}
    abl[g] = {k: {"pr_auc_sin_grupo": round(float(r[k]), 4), "caida": round(float(base[k] - r[k]), 4)} for k in r}
    print("ablación", g, abl[g]["validacion"], abl[g]["arequipa"])
out["ablacion"] = {"pr_auc_modelo_8_grupos": {k: round(float(v), 4) for k, v in base.items()}, "por_grupo": abl}

imp = pd.Series(final.booster_.feature_importance("gain"), index=V_FINAL)
imp = 100 * imp / imp.sum()
out["importancia"] = imp.sort_values(ascending=False).round(2).to_dict()
out["importancia_grupo"] = imp.groupby([CATALOGO[v][0] for v in V_FINAL]).sum().sort_values(ascending=False).round(1).to_dict()

# ---------------- niveles, calibración y anticipación ----------------
pv = calibrar(final.predict_proba(va[V_FINAL])[:, 1])
u_alto = float(np.quantile(pv, 1 - C.CUOTA_ALTO))
u_medio = float(np.quantile(pv, 1 - C.CUOTA_ALTO - C.CUOTA_MEDIO))


def nivel(p):
    return np.where(p >= u_alto, "ALTO", np.where(p >= u_medio, "MEDIO", "BAJO"))


te["p"] = calibrar(final.predict_proba(te[V_FINAL])[:, 1])
te["nivel"] = nivel(te.p)
out["niveles"] = {"umbral_alto": round(u_alto, 4), "umbral_medio": round(u_medio, 4)}
for amb, d in (("arequipa", te[te.dep_code == C.AREQUIPA]), ("nacional", te)):
    g = d.groupby("nivel").agg(filas=("y", "size"), eventos=("y", "sum"), tasa_observada=("y", "mean"), prob_media=("p", "mean"))
    out["niveles"][amb] = g.round(4).reset_index().to_dict("records")
te["decil"] = pd.qcut(te.p.rank(method="first"), 10, labels=False)
out["calibracion_nacional"] = te.groupby("decil").agg(prob_media=("p", "mean"), tasa_observada=("y", "mean"),
                                                      filas=("y", "size")).round(4).reset_index().to_dict("records")
todos = panel[panel["T"] > C.FIN_VALIDACION].copy()
todos["p"] = calibrar(final.predict_proba(todos[V_FINAL])[:, 1])
todos["nivel"] = nivel(todos.p)
ev = todos[todos.f_evento.notna() & (pd.to_datetime(todos.f_evento) > C.FIN_VALIDACION)]
ant = []
for c, g in ev.groupby("cuaderno_id"):
    f = pd.to_datetime(g.f_evento.iloc[0])
    a = g[(g.nivel == "ALTO") & ((f - g["T"]).dt.days <= 120)]
    ant.append({"dep": g.dep_code.iloc[0], "alertada": len(a) > 0, "dias": int((f - a["T"].min()).days) if len(a) else None})
ant = pd.DataFrame(ant)
for amb, d in (("arequipa", ant[ant.dep == C.AREQUIPA]), ("nacional", ant)):
    a = d[d.alertada]
    out.setdefault("anticipacion", {})[amb] = {
        "obras_con_evento": int(len(d)), "alertadas_antes": int(len(a)), "pct_alertadas": round(100 * len(a) / max(len(d), 1), 1),
        "dias_anticipacion_mediana": float(a.dias.median()) if len(a) else None,
        "dias_anticipacion_p25_p75": [float(a.dias.quantile(.25)), float(a.dias.quantile(.75))] if len(a) else None}

final.booster_.save_model(str(C.TRABAJO / "modelo.txt"))
joblib.dump({"platt": platt, "umbral_alto": u_alto, "umbral_medio": u_medio, "vars": V_FINAL}, C.TRABAJO / "calibrador.joblib")
te[["cuaderno_id", "T", "dep_code", "y", "p", "nivel"]].to_parquet(C.TRABAJO / "predicciones_prueba.parquet", index=False)
(C.RESULTADOS / "p04_modelo.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(out["seleccion"], ensure_ascii=False))
for k, v in out["resultados"]["arequipa"]["modelos"].items():
    print(f"{k:36s} AP {v['pr_auc']:.3f} {v['pr_auc_ic95']} ROC {v['roc_auc']:.3f} P20 {v['precision_top20']:.3f} R20 {v['recall_top20']:.3f}")
print("nac M", out["resultados"]["nacional"]["modelos"][M])
print(out["importancia_grupo"], out["anticipacion"], out["niveles"]["arequipa"], out["comparacion_pareada"] if "comparacion_pareada" in out else "")
