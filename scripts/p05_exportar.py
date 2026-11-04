"""Paso 5. Exporta lo que muestra el prototipo: obras de Arequipa en ejecución al último corte.

Por obra: riesgo de atraso a 60 días, su evolución mes a mes y sus razones (contribuciones por variable),
indicadores clave de plazo, avance, dinero e historial, auditoría de consultas (quién traba) e historia con la
prueba escrita (asientos anonimizados). Además: resumen global y ficha técnica del modelo.

Antes de escribir se aplica una puerta de calidad (probabilidades en [0, 1], nivel coherente con los umbrales, una ficha por
obra, textos anonimizados). meta.json fija el contrato con la web: versión de esquema, corte, huella del modelo y del código.

Salida: web/data/resumen.json, web/data/obras.json, web/data/modelo.json, web/data/meta.json, web/data/obra/<id>.json
"""
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import duckdb  # noqa: E402
import joblib  # noqa: E402
import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra.indicadores import CATALOGO, CATEGORICAS, GRUPOS, frase  # noqa: E402
from caja_negra.texto import RE_PERSONA, anonimizar  # noqa: E402

ESQUEMA = 1  # subir si cambia la forma de los JSON que lee web/js

sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
A, K = (C.TRABAJO / "asientos.parquet").as_posix(), (C.TRABAJO / "cuadernos.parquet").as_posix()
modelo = lgb.Booster(model_file=str(C.TRABAJO / "modelo.txt"))
cal = joblib.load(C.TRABAJO / "calibrador.joblib")
VARS = cal["vars"]
leerj = lambda n: json.loads((C.RESULTADOS / n).read_text(encoding="utf-8"))  # noqa: E731
met, emp, plz, ind = leerj("p04_modelo.json"), leerj("p02_emparejador.json"), leerj("p03_plazos.json"), leerj("p03b_indicadores.json")


def calibrar(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return cal["platt"].predict_proba(np.log(p / (1 - p)).reshape(-1, 1))[:, 1]


def nivel(p):
    return np.where(p >= cal["umbral_alto"], "ALTO", np.where(p >= cal["umbral_medio"], "MEDIO", "BAJO"))


panel = pd.read_parquet(C.TRABAJO / "panel_ampliado.parquet")
panel["T"] = pd.to_datetime(panel["T"])
aqp = panel[panel.dep_code == C.AREQUIPA].copy()
aqp["p"] = calibrar(modelo.predict(aqp[VARS]))
corte = panel["T"].max()
act = aqp[aqp["T"] == corte].copy()
act["nivel"] = nivel(act.p)
contrib = modelo.predict(act[VARS], pred_contrib=True)
base_logit = float(contrib[0, -1])
contrib = contrib[:, :-1]

niv_aqp = {r["nivel"]: r for r in met["niveles"]["arequipa"]}
base_aqp = met["resultados"]["arequipa"]["prevalencia"]
cuad = con.sql(f"select * from '{K}' where dep_code = '{C.AREQUIPA}'").df().set_index("cuaderno_id")
Q = pd.read_parquet(C.TRABAJO / "consultas_auditadas.parquet")
Q = Q[Q.cuaderno_id.isin(act.cuaderno_id)]
ids = "', '".join(act.cuaderno_id)
asi = con.sql(f"select cuaderno_id, nro_asiento, fecha, rol, tipo_std, titulo, descripcion from '{A}' where cuaderno_id in ('{ids}')").df()
asi["fecha"] = pd.to_datetime(asi.fecha)
texto = {(c, n): (t, d) for c, n, t, d in zip(asi.cuaderno_id, asi.nro_asiento, asi.titulo, asi.descripcion)}

ROL = {"SOEC_RESI": "Residente", "SOEC_SPV": "Supervisor", "SOEC_INSP": "Inspector", "SOEC_JEEXPTE": "Jefe de expediente", "SOEC_LIDER": "Líder"}
HITOS = {"SUSPENSION_PLAZO": "Suspensión del plazo", "AMPLIACION_PLAZO": "Ampliación de plazo", "ADICIONALES": "Adicional de obra",
         "PENALIDADES": "Penalidad", "RIESGOS": "Riesgo", "RESOLUCION_CONTRATO": "Resolución de contrato", "INICIO_PLAZO": "Inicio del plazo",
         "PERSONAL_CLAVE": "Cambio de personal clave", "EXPEDIENTE_TECNICO": "Expediente técnico"}
METODO = {"cita_asiento": "La respuesta cita el número de asiento", "numero_consulta": "La respuesta cita el número de consulta",
          "asiento_anterior": "La respuesta cita «el asiento anterior»", "ia_semantica": "Enlazada por la IA (lectura del texto)"}
CLAVE = ["plazo_consumido", "dias_restantes_plazo", "avance_reportado", "plazo_vs_avance", "ampliaciones", "consultas_vencidas",
         "devengado_sobre_viable", "meses_sin_devengado", "contratista_atrasos_previos", "entidad_atrasos_previos", "lluvias_en_horizonte",
         "log_monto_contratado"]


def asiento(c, n, limite=420):
    t, d = texto.get((c, int(n)), ("", ""))
    return {"nro": int(n), "titulo": anonimizar(t, 160), "texto": anonimizar(d, limite)}


def valor(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return round(float(v), 4) if isinstance(v, (int, float, np.integer, np.floating)) else str(v)


salida = C.WEB_DATOS / "obra"
shutil.rmtree(salida, ignore_errors=True)
salida.mkdir(parents=True)
lista = []
for i, r in enumerate(act.itertuples()):
    k = cuad.loc[r.cuaderno_id]
    fila = act.iloc[i]
    aportes = []
    for j in np.argsort(-np.abs(contrib[i])):
        v = VARS[j]
        if v in CATEGORICAS or pd.isna(fila[v]) or abs(contrib[i][j]) < 1e-3:
            continue
        aportes.append({"variable": v, "grupo": GRUPOS[CATALOGO[v][0]], "frase": frase(v, float(fila[v])), "peso": round(float(contrib[i][j]), 3)})
        if len(aportes) == 8:
            break
    q = Q[Q.cuaderno_id == r.cuaderno_id].sort_values("nro_c")
    consultas = []
    for c in q.itertuples():
        x = asiento(r.cuaderno_id, c.nro_c, 300)
        consultas.append({"nro": int(c.nro_c), "fecha": str(c.f_c.date()), "titulo": x["titulo"], "texto": x["texto"],
                          "estado": c.veredicto, "dias": int(c.dias_al_corte), "plazo": int(c.plazo), "responsable": c.responsable,
                          "respuesta": None if pd.isna(c.nro_r) else {
                              "nro": int(c.nro_r), "fecha": str(pd.Timestamp(c.f_r).date()), "metodo": METODO[c.metodo],
                              "confianza": round(float(c.confianza), 2),
                              **{k2: v2 for k2, v2 in asiento(r.cuaderno_id, c.nro_r, 300).items() if k2 != "nro"}}})
    a = asi[asi.cuaderno_id == r.cuaderno_id]
    hitos = [{"fecha": str(h.fecha.date()), "tipo": HITOS[h.tipo_std], "rol": ROL.get(h.rol, h.rol), **asiento(r.cuaderno_id, h.nro_asiento, 260)}
             for h in a[a.tipo_std.isin(list(HITOS))].sort_values(["fecha", "nro_asiento"]).itertuples()]
    meses = a.assign(mes=a.fecha.dt.strftime("%Y-%m")).groupby("mes").agg(
        asientos=("nro_asiento", "size"), consultas=("tipo_std", lambda s: int((s == "CONSULTAS").sum())),
        alertas=("tipo_std", lambda s: int(s.isin(["SUSPENSION_PLAZO", "AMPLIACION_PLAZO", "RIESGOS", "PENALIDADES"]).sum())))
    hist = aqp[aqp.cuaderno_id == r.cuaderno_id].sort_values("T")
    estados = q.veredicto.value_counts().to_dict()
    ficha = {
        "id": r.cuaderno_id, "nombre": k.denominacion, "entidad": k.entidad, "contratista": k.contratista,
        "provincia": k.provincia, "distrito": k.distrito, "cui": None if pd.isna(k.cui) else k.cui,
        "primer_asiento": str(pd.Timestamp(k.primer_asiento).date()), "ultimo_asiento": str(pd.Timestamp(k.ultimo_asiento).date()),
        "riesgo": {"probabilidad": round(float(r.p), 4), "nivel": r.nivel, "tasa_observada_nivel": niv_aqp[r.nivel]["tasa_observada"],
                   "veces_tasa_base": round(float(r.p) / base_aqp, 1), "aportes": aportes,
                   "historia": [{"mes": t.strftime("%Y-%m"), "p": round(float(p), 4)} for t, p in zip(hist["T"], hist.p)]},
        "indicadores": [{"variable": v, "grupo": GRUPOS[CATALOGO[v][0]], "valor": valor(fila[v]),
                         "frase": None if pd.isna(fila[v]) else frase(v, float(fila[v]))} for v in CLAVE],
        "consultas_resumen": {e: int(estados.get(e, 0)) for e in ("A tiempo", "Tarde", "En plazo", "Sin respuesta en el cuaderno")},
        "consultas": consultas, "hitos": hitos,
        "meses": [{"mes": m, **{c2: int(v) for c2, v in row.items()}} for m, row in meses.iterrows()],
    }
    (salida / f"{r.cuaderno_id}.json").write_text(json.dumps(ficha, ensure_ascii=False), encoding="utf-8")
    prev = hist.p.iloc[-2] if len(hist) > 1 else None
    lista.append({"id": r.cuaderno_id, "nombre": k.denominacion, "entidad": k.entidad, "provincia": k.provincia, "distrito": k.distrito,
                  "probabilidad": ficha["riesgo"]["probabilidad"], "nivel": r.nivel,
                  "tendencia": None if prev is None else round(float(r.p - prev), 4),
                  "consultas_vencidas": ficha["consultas_resumen"]["Sin respuesta en el cuaderno"],
                  "consultas_tarde": ficha["consultas_resumen"]["Tarde"],
                  "razon": next((x["frase"] for x in aportes if x["peso"] > 0), "")})
lista.sort(key=lambda x: -x["probabilidad"])
(C.WEB_DATOS / "obras.json").write_text(json.dumps(lista, ensure_ascii=False), encoding="utf-8")

res_aqp = met["resultados"]["arequipa"]
resumen = {
    "corte": str(corte.date()), "fuente": "OECE · cuaderno de obra digital (datos abiertos), asientos 2024-06 a 2026-08",
    "obras": len(lista), "por_nivel": pd.Series([x["nivel"] for x in lista]).value_counts().to_dict(),
    "consultas_arequipa": plz["arequipa"], "plazos": plz["plazos"], "emparejador": emp["evaluacion"]["prueba"],
    "contraloria": {"fuente": "Contraloría General de la República, Informe N.° 001-2026-CG/SESNC (corte 31-03-2026)",
                    "obras_paralizadas_arequipa": 126, "costo_actualizado_arequipa": 8383127703, "saldo_arequipa": 5605782805,
                    "obras_paralizadas_pais": 2241, "costo_actualizado_pais": 73166004078},
}
(C.WEB_DATOS / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1), encoding="utf-8")

modelo_json = {
    "grupos": GRUPOS,
    "catalogo": [{"variable": v, "grupo": GRUPOS[g], "formula": f, "fuente": fu, "por_que": pq,
                  "cobertura_arequipa": ind["cobertura_pct"]["arequipa"][v], "importancia": met["importancia"].get(v, 0)}
                 for v, (g, f, fu, pq, _) in CATALOGO.items()],
    "importancia_grupo": met["importancia_grupo"], "ablacion": met["ablacion"], "seleccion": met["seleccion"],
    "resultados": met["resultados"], "niveles": met["niveles"], "anticipacion": met["anticipacion"],
    "calibracion_nacional": met["calibracion_nacional"], "particion": met["particion"], "base_logit": round(base_logit, 4),
    "platt": {"A": round(float(cal["platt"].coef_[0][0]), 4), "B": round(float(cal["platt"].intercept_[0]), 4)},
    "arboles": modelo.num_trees(),
    "hiperparametros": {k: modelo.params[k] for k in ("learning_rate", "num_leaves", "min_data_in_leaf", "lambda_l2",
                                                      "bagging_fraction", "feature_fraction")},
    "horizonte_dias": C.HORIZONTE,
}
(C.WEB_DATOS / "modelo.json").write_text(json.dumps(modelo_json, ensure_ascii=False), encoding="utf-8")

# ---------------- puerta de calidad antes de publicar ----------------
fichas = {p.stem for p in salida.glob("*.json")}
assert fichas == {x["id"] for x in lista}, "cada obra listada debe tener su ficha y viceversa"
for x in lista:
    assert 0 <= x["probabilidad"] <= 1, x
    esperado = "ALTO" if x["probabilidad"] >= cal["umbral_alto"] else "MEDIO" if x["probabilidad"] >= cal["umbral_medio"] else "BAJO"
    assert x["nivel"] == esperado, (x["id"], x["nivel"], esperado)
for p in salida.glob("*.json"):
    ficha = json.loads(p.read_text(encoding="utf-8"))
    textos = [c["texto"] for c in ficha["consultas"]] + [h["texto"] for h in ficha["hitos"]]
    assert not any(RE_PERSONA.search(t or "") for t in textos), f"texto sin anonimizar en {p.name}"


def huella(ruta):
    return hashlib.sha256(Path(ruta).read_bytes()).hexdigest()[:16]


try:
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=C.RAIZ, capture_output=True, text=True, check=True).stdout.strip()
except (OSError, subprocess.CalledProcessError):
    commit = None
meta = {"esquema": ESQUEMA, "corte": str(corte.date()), "generado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commit": commit, "obras": len(lista),
        "modelo": {"huella": huella(C.TRABAJO / "modelo.txt"), "calibrador": huella(C.TRABAJO / "calibrador.joblib"),
                   "arboles": modelo.num_trees(), "indicadores": len(VARS), "seleccionado": met["seleccion"]["modelo_final"]},
        "fuentes": ["OECE cuaderno de obra digital", "MEF SIAF y Banco de Inversiones", "INFOBRAS", "SEACE / CONOSCE",
                    "Contraloría, Informe N.° 001-2026-CG/SESNC"]}
(C.WEB_DATOS / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({"obras": len(lista), "por_nivel": resumen["por_nivel"], "top": [(x["probabilidad"], x["razon"]) for x in lista[:5]]}, ensure_ascii=False, indent=1))
