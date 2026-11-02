"""Paso 2. Emparejador consulta <-> respuesta (regla + IA).

1. Regla: la respuesta cita el número de asiento, «el asiento anterior» o el número de consulta.
2. IA: para las respuestas sin cita, un modelo elige la consulta que responde entre las consultas
   anteriores del mismo cuaderno, usando el significado del texto (Sentence-BERT) y el contexto.
   Se entrena con las respuestas que sí citan el número (etiqueta gratuita y verificable), con ese
   número borrado del texto para que el modelo no lo «lea».

Salida: datos/pares.parquet, resultados/p02_emparejador.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import duckdb  # noqa: E402
import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra import texto as T  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
VENTANA = 180          # días hacia atrás en los que se buscan consultas candidatas
MODELO_TEXTO = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

con = duckdb.connect()
A, K = (C.TRABAJO / "asientos.parquet").as_posix(), (C.TRABAJO / "cuadernos.parquet").as_posix()
df = con.sql(f"""
  select a.cuaderno_id, a.nro_asiento nro, a.fecha, a.rol, a.tipo_std,
         coalesce(a.titulo,'') || ' || ' || coalesce(a.descripcion,'') texto, k.dep_code
  from '{A}' a join '{K}' k using (cuaderno_id)
  where a.tipo_std in ('CONSULTAS', 'RESPUESTAS_CONSULTAS')
  order by a.cuaderno_id, a.nro_asiento""").df()
df["fecha"] = pd.to_datetime(df["fecha"])
df = df.drop_duplicates(["cuaderno_id", "nro"]).reset_index(drop=True)
cons = df[df.tipo_std == "CONSULTAS"].reset_index(drop=True)
resp = df[df.tipo_std == "RESPUESTAS_CONSULTAS"].reset_index(drop=True)
print(f"consultas {len(cons):,} | respuestas {len(resp):,}")

# ---------------- 1. regla ----------------
clave_c = {(c, n): i for i, (c, n) in enumerate(zip(cons.cuaderno_id, cons.nro))}
num_consulta = {}  # (cuaderno, número de consulta) -> índice de la consulta que lo menciona primero
for i in cons.sort_values("nro").index:
    for k in T.refs_consulta(cons.at[i, "texto"]):
        num_consulta.setdefault((cons.at[i, "cuaderno_id"], k), i)

reglas, cat = [], []
for j, r in resp.iterrows():
    refs = [n for n in T.refs_asiento(r.texto) if n < r.nro]
    hits = [clave_c[(r.cuaderno_id, n)] for n in refs if (r.cuaderno_id, n) in clave_c]
    metodo = "cita_asiento"
    if not hits and T.cita_anterior(r.texto) and (r.cuaderno_id, r.nro - 1) in clave_c:
        hits, metodo = [clave_c[(r.cuaderno_id, r.nro - 1)]], "asiento_anterior"
    if not hits:
        hits = [num_consulta[(r.cuaderno_id, k)] for k in T.refs_consulta(r.texto)
                if (r.cuaderno_id, k) in num_consulta and cons.at[num_consulta[(r.cuaderno_id, k)], "nro"] < r.nro]
        metodo = "numero_consulta"
    cat.append("con_cita" if hits else ("cita_otro_asiento" if refs else "sin_cita"))
    for i in set(hits):
        reglas.append((i, j, metodo))
resp["cat"] = cat
R = pd.DataFrame(reglas, columns=["ic", "ir", "metodo"])
print("pares por regla:", R.metodo.value_counts().to_dict())

# ---------------- embeddings ----------------
emb_path = C.TRABAJO / "emb_consultas_respuestas.npy"
textos = [T.sin_referencias(t)[:700] for t in pd.concat([cons.texto, resp.texto])]
if emb_path.exists() and np.load(emb_path, mmap_mode="r").shape[0] == len(textos):
    E = np.load(emb_path)
else:
    from sentence_transformers import SentenceTransformer
    m = SentenceTransformer(MODELO_TEXTO, device="cuda")
    m.max_seq_length = 128
    E = m.encode(textos, batch_size=256, show_progress_bar=True, normalize_embeddings=True).astype(np.float16)
    np.save(emb_path, E)
Ec, Er = E[: len(cons)].astype(np.float32), E[len(cons):].astype(np.float32)

# ---------------- candidatos y variables ----------------
por_cuaderno = cons.groupby("cuaderno_id").indices
dia_c = cons.fecha.values.astype("datetime64[D]").astype(np.int64)
dia_r = resp.fecha.values.astype("datetime64[D]").astype(np.int64)
nro_c, nro_r, cuad_r = cons.nro.values, resp.nro.values, resp.cuaderno_id.values
resp_regla = R.groupby("ic")["ir"].apply(list).to_dict()   # consulta -> respuestas que la citan


def candidatos(j):
    idx = por_cuaderno.get(cuad_r[j], np.array([], int))
    idx = idx[(nro_c[idx] < nro_r[j]) & (dia_c[idx] >= dia_r[j] - VENTANA)]
    if len(idx) == 0:
        return None
    f = pd.DataFrame({"ic": idx})
    f["sim"] = Ec[idx] @ Er[j]
    f["dias"] = dia_r[j] - dia_c[idx]
    f["rank_rec"] = (-nro_c[idx]).argsort().argsort() + 1
    f["rank_sim"] = (-f.sim.values).argsort().argsort() + 1
    f["dif_sim_max"] = f.sim - f.sim.max()
    f["n_cand"] = len(idx)
    f["ya_respondida"] = [any(nro_r[x] < nro_r[j] for x in resp_regla.get(i, []) if x != j) for i in idx]
    f["consulta_residente"] = (cons.rol.values[idx] == "SOEC_RESI").astype(int)
    f["ir"] = j
    return f


VARS = ["sim", "dias", "rank_rec", "rank_sim", "dif_sim_max", "n_cand", "ya_respondida", "consulta_residente"]

# Oro: respuestas que citan exactamente una consulta por número de asiento.
oro = R[R.metodo == "cita_asiento"].groupby("ir").filter(lambda g: len(g) == 1)
filas = []
for j, ic in zip(oro.ir, oro.ic):
    f = candidatos(j)
    if f is None or ic not in set(f.ic) or len(f) < 2:
        continue
    f["y"] = (f.ic == ic).astype(int)
    filas.append(f)
G = pd.concat(filas, ignore_index=True)
G["dep"] = resp.dep_code.values[G.ir]
G["cuaderno_id"] = resp.cuaderno_id.values[G.ir]
G["ya_respondida"] = G.ya_respondida.astype(int)

# Partición: Arequipa = prueba; resto del país = entrenamiento (80 %) y validación (20 %) por cuaderno.
rng = np.random.default_rng(C.SEMILLA)
cuads = G.loc[G.dep != C.AREQUIPA, "cuaderno_id"].unique()
val_c = set(rng.choice(cuads, size=int(0.2 * len(cuads)), replace=False))
G["parte"] = np.where(G.dep == C.AREQUIPA, "prueba", np.where(G.cuaderno_id.isin(val_c), "validacion", "entrenamiento"))

modelo = lgb.LGBMClassifier(n_estimators=400, learning_rate=0.05, num_leaves=31, min_child_samples=40,
                            subsample=0.8, subsample_freq=1, colsample_bytree=0.9, random_state=C.SEMILLA, verbose=-1)
tr = G[G.parte == "entrenamiento"]
modelo.fit(tr[VARS], tr.y)
G["p"] = modelo.predict_proba(G[VARS])[:, 1]


def elegido(g, col, menor=False):
    return g.loc[g[col].idxmin() if menor else g[col].idxmax(), "y"]


def evaluar(parte):
    g = G[G.parte == parte]
    grupos = g.groupby("ir")
    no_resp = g[g.ya_respondida == 0]
    acc = lambda s: round(float(np.mean(s)), 4)  # noqa: E731
    return {
        "respuestas": int(grupos.ngroups),
        "candidatos_promedio": round(float(grupos.size().mean()), 2),
        "azar": acc(grupos.apply(lambda x: 1 / len(x))),
        "regla_mas_reciente": acc(grupos.apply(lambda x: elegido(x, "rank_rec", menor=True))),
        "regla_mas_reciente_no_respondida": acc(no_resp.groupby("ir").apply(lambda x: elegido(x, "rank_rec", menor=True))
                                                .reindex(grupos.groups.keys(), fill_value=0)),
        "solo_similitud_texto": acc(grupos.apply(lambda x: elegido(x, "sim"))),
        "modelo_ia": acc(grupos.apply(lambda x: elegido(x, "p"))),
    }


ev = {p: evaluar(p) for p in ("validacion", "prueba")}

# Umbral de confianza: el menor que logra precisión >= 90 % en validación.
top = G.loc[G.groupby("ir").p.idxmax(), ["ir", "p", "y", "parte"]]
umbral = 0.5
for u in np.arange(0.05, 0.96, 0.01):
    v = top[(top.parte == "validacion") & (top.p >= u)]
    if len(v) and v.y.mean() >= 0.90:
        umbral = round(float(u), 2)
        break
for p in ("validacion", "prueba"):
    s = top[(top.parte == p) & (top.p >= umbral)]
    ev[p]["umbral"] = umbral
    ev[p]["cobertura_con_umbral"] = round(len(s) / max((top.parte == p).sum(), 1), 4)
    ev[p]["precision_con_umbral"] = round(float(s.y.mean()), 4) if len(s) else None
# Intervalo bootstrap (por cuaderno) de la exactitud del modelo en Arequipa.
pr = top[top.parte == "prueba"].assign(c=lambda d: resp.cuaderno_id.values[d.ir])
cs = pr.c.unique()
boots = []
for _ in range(1000):
    m = pr.set_index("c").loc[rng.choice(cs, len(cs))]
    boots.append(m.y.mean())
ev["prueba"]["modelo_ia_ic95"] = [round(float(np.percentile(boots, 2.5)), 4), round(float(np.percentile(boots, 97.5)), 4)]
imp = dict(zip(VARS, modelo.booster_.feature_importance("gain").round(1).tolist()))

# ---------------- aplicación a las respuestas sin cita ----------------
ia = []
for j in resp.index[resp.cat != "con_cita"]:
    f = candidatos(j)
    if f is None:
        continue
    f["ya_respondida"] = f.ya_respondida.astype(int)
    f["p"] = modelo.predict_proba(f[VARS])[:, 1]
    b = f.loc[f.p.idxmax()]
    if b.p >= umbral:
        ia.append((int(b.ic), j, "ia_semantica", float(b.p)))
IA = pd.DataFrame(ia, columns=["ic", "ir", "metodo", "confianza"])
P = pd.concat([R.assign(confianza=1.0), IA], ignore_index=True)
P = P.assign(cuaderno_id=cons.cuaderno_id.values[P.ic], nro_c=cons.nro.values[P.ic], f_c=cons.fecha.values[P.ic],
             rol_c=cons.rol.values[P.ic], nro_r=resp.nro.values[P.ir], f_r=resp.fecha.values[P.ir],
             rol_r=resp.rol.values[P.ir], ruta_proyectista=[T.ruta_proyectista(t) for t in resp.texto.values[P.ir]])
P.drop(columns=["ic", "ir"]).to_parquet(C.TRABAJO / "pares.parquet", index=False)

out = {
    "respuestas_por_categoria": {d: resp[resp.dep_code == C.AREQUIPA].cat.value_counts().to_dict() if d == "arequipa"
                                 else resp.cat.value_counts().to_dict() for d in ("arequipa", "nacional")},
    "pares_por_metodo": {"nacional": P.metodo.value_counts().to_dict(),
                         "arequipa": P[P.cuaderno_id.isin(set(cons.cuaderno_id[cons.dep_code == C.AREQUIPA]))].metodo.value_counts().to_dict()},
    "conjunto_oro": {p: int(G[G.parte == p].ir.nunique()) for p in ("entrenamiento", "validacion", "prueba")},
    "evaluacion": ev,
    "importancia_variables": imp,
    "modelo_texto": MODELO_TEXTO,
    "ventana_dias": VENTANA,
}
(C.RESULTADOS / "p02_emparejador.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, default=int), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=1, default=int))
