"""Paso 5. Exporta lo que muestra el prototipo: obras de Arequipa en ejecución al último corte.

Por obra: riesgo de atraso a 60 días y sus razones, auditoría de consultas (quién traba) e historia con
la prueba escrita (asientos anonimizados). Además un resumen global con las métricas de evaluación.

Salida: web/data/resumen.json, web/data/obras.json, web/data/obra/<id>.json
"""
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import duckdb  # noqa: E402
import joblib  # noqa: E402
import lightgbm as lgb  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra.texto import anonimizar  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
A, K = (C.TRABAJO / "asientos.parquet").as_posix(), (C.TRABAJO / "cuadernos.parquet").as_posix()
modelo = lgb.Booster(model_file=str(C.TRABAJO / "modelo.txt"))
cal = joblib.load(C.TRABAJO / "calibrador.joblib")
VARS = cal["vars"]
met = json.loads((C.RESULTADOS / "p04_modelo.json").read_text(encoding="utf-8"))
emp = json.loads((C.RESULTADOS / "p02_emparejador.json").read_text(encoding="utf-8"))
plz = json.loads((C.RESULTADOS / "p03_plazos.json").read_text(encoding="utf-8"))


def calibrar(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return cal["platt"].predict_proba(np.log(p / (1 - p)).reshape(-1, 1))[:, 1]


panel = pd.read_parquet(C.TRABAJO / "panel.parquet")
panel["T"] = pd.to_datetime(panel["T"])
corte = panel["T"].max()
act = panel[(panel["T"] == corte) & (panel.dep_code == C.AREQUIPA)].copy()
raw = modelo.predict(act[VARS])
act["p"] = calibrar(raw)
act["nivel"] = np.where(act.p >= cal["umbral_alto"], "ALTO", np.where(act.p >= cal["umbral_medio"], "MEDIO", "BAJO"))
contrib = modelo.predict(act[VARS], pred_contrib=True)[:, :-1]

niv_aqp = {r["nivel"]: r for r in met["niveles"]["arequipa"]}
base_aqp = met["resultados"]["arequipa"]["prevalencia"]


def pct(v):
    return f"{100 * v:.0f} %"


FRASES = {
    "dias_sin_asientos": lambda v: ("Tuvo anotaciones en la última semana del mes" if v <= 7
                                    else f"Lleva {v:.0f} días sin anotaciones en el cuaderno"),
    "asientos_30d": lambda v: f"{v:.0f} anotaciones en el último mes",
    "asientos_90d": lambda v: f"{v:.0f} anotaciones en los últimos 90 días",
    "asientos_total": lambda v: f"{v:.0f} anotaciones desde el inicio",
    "prop_supervisor_90d": lambda v: f"El supervisor escribió el {pct(v)} de las anotaciones recientes",
    "alertas_90d": lambda v: f"{v:.0f} anotaciones de suspensión, ampliación o riesgo en 90 días",
    "suspensiones": lambda v: f"{v:.0f} anotaciones de suspensión del plazo",
    "ampliaciones": lambda v: f"{v:.0f} anotaciones de ampliación de plazo",
    "adicionales": lambda v: f"{v:.0f} anotaciones de adicionales de obra",
    "mayores_metrados": lambda v: f"{v:.0f} anotaciones de mayores metrados",
    "riesgos": lambda v: f"{v:.0f} riesgos anotados",
    "penalidades": lambda v: f"{v:.0f} anotaciones sobre penalidades",
    "ordenes": lambda v: f"{v:.0f} órdenes del supervisor",
    "valorizaciones": lambda v: f"{v:.0f} valorizaciones anotadas",
    "cambio_personal": lambda v: f"{v:.0f} anotaciones de cambio de personal clave",
    "meses_desde_inicio": lambda v: f"{v:.0f} meses de obra registrados",
    "consultas": lambda v: f"{v:.0f} consultas del residente en total",
    "consultas_90d": lambda v: f"{v:.0f} consultas nuevas en los últimos 90 días",
    "consultas_vencidas": lambda v: f"{v:.0f} consultas con plazo vencido y sin respuesta en el cuaderno",
    "consultas_en_plazo": lambda v: f"{v:.0f} consultas esperando respuesta dentro del plazo",
    "max_dias_espera": lambda v: f"Una consulta espera respuesta desde hace {v:.0f} días",
    "respondidas_tarde": lambda v: f"{v:.0f} consultas respondidas fuera de plazo",
    "respondidas": lambda v: f"{v:.0f} consultas con respuesta registrada",
    "mediana_dias_respuesta": lambda v: ("Ninguna consulta tiene respuesta registrada" if v < 0
                                         else f"Las consultas se responden en {v:.0f} días (mediana)"),
    "pct_respondidas_tarde": lambda v: f"El {pct(v)} de las respuestas llegó fuera de plazo",
}

cuad = con.sql(f"select * from '{K}' where dep_code = '{C.AREQUIPA}'").df().set_index("cuaderno_id")
Q = pd.read_parquet(C.TRABAJO / "consultas_auditadas.parquet")
Q = Q[Q.cuaderno_id.isin(act.cuaderno_id)]
ids = "', '".join(act.cuaderno_id)
asi = con.sql(f"""select cuaderno_id, nro_asiento, fecha, rol, tipo_std, titulo, descripcion from '{A}'
                  where cuaderno_id in ('{ids}')""").df()
asi["fecha"] = pd.to_datetime(asi.fecha)
texto = {(c, n): (t, d) for c, n, t, d in zip(asi.cuaderno_id, asi.nro_asiento, asi.titulo, asi.descripcion)}

ROL = {"SOEC_RESI": "Residente", "SOEC_SPV": "Supervisor", "SOEC_INSP": "Inspector", "SOEC_JEEXPTE": "Jefe de expediente",
       "SOEC_LIDER": "Líder"}
HITOS = {"SUSPENSION_PLAZO": "Suspensión del plazo", "AMPLIACION_PLAZO": "Ampliación de plazo", "ADICIONALES": "Adicional de obra",
         "PENALIDADES": "Penalidad", "RIESGOS": "Riesgo", "RESOLUCION_CONTRATO": "Resolución de contrato",
         "INICIO_PLAZO": "Inicio del plazo", "PERSONAL_CLAVE": "Cambio de personal clave", "EXPEDIENTE_TECNICO": "Expediente técnico"}
METODO = {"cita_asiento": "La respuesta cita el número de asiento", "numero_consulta": "La respuesta cita el número de consulta",
          "asiento_anterior": "La respuesta cita «el asiento anterior»", "ia_semantica": "Enlazada por la IA (lectura del texto)"}


def asiento(c, n, limite=420):
    t, d = texto.get((c, int(n)), ("", ""))
    return {"nro": int(n), "titulo": anonimizar(t, 160), "texto": anonimizar(d, limite)}


salida = C.WEB_DATOS / "obra"
shutil.rmtree(salida, ignore_errors=True)
salida.mkdir(parents=True)
lista = []
for i, r in enumerate(act.itertuples()):
    k = cuad.loc[r.cuaderno_id]
    orden = np.argsort(-contrib[i])
    razones = [{"frase": FRASES[VARS[j]](float(getattr(r, VARS[j]))), "peso": round(float(contrib[i][j]), 3)}
               for j in orden[:3] if contrib[i][j] > 0]
    calma = [{"frase": FRASES[VARS[j]](float(getattr(r, VARS[j]))), "peso": round(float(contrib[i][j]), 3)}
             for j in np.argsort(contrib[i])[:2] if contrib[i][j] < 0]
    q = Q[Q.cuaderno_id == r.cuaderno_id].sort_values("nro_c")
    consultas = []
    for c in q.itertuples():
        x = asiento(r.cuaderno_id, c.nro_c, 300)
        consultas.append({"nro": int(c.nro_c), "fecha": str(c.f_c.date()), "titulo": x["titulo"], "texto": x["texto"],
                          "estado": c.veredicto, "dias": int(c.dias_al_corte), "plazo": int(c.plazo),
                          "responsable": c.responsable,
                          "respuesta": None if pd.isna(c.nro_r) else {
                              "nro": int(c.nro_r), "fecha": str(pd.Timestamp(c.f_r).date()), "metodo": METODO[c.metodo],
                              "confianza": round(float(c.confianza), 2), **{k2: v for k2, v in asiento(r.cuaderno_id, c.nro_r, 300).items() if k2 != "nro"}}})
    a = asi[asi.cuaderno_id == r.cuaderno_id]
    hitos = [{"fecha": str(h.fecha.date()), "tipo": HITOS[h.tipo_std], "rol": ROL.get(h.rol, h.rol), **asiento(r.cuaderno_id, h.nro_asiento, 260)}
             for h in a[a.tipo_std.isin(list(HITOS))].sort_values(["fecha", "nro_asiento"]).itertuples()]
    meses = a.assign(mes=a.fecha.dt.strftime("%Y-%m")).groupby("mes").agg(
        asientos=("nro_asiento", "size"),
        consultas=("tipo_std", lambda s: int((s == "CONSULTAS").sum())),
        alertas=("tipo_std", lambda s: int(s.isin(["SUSPENSION_PLAZO", "AMPLIACION_PLAZO", "RIESGOS", "PENALIDADES"]).sum())))
    estados = q.veredicto.value_counts().to_dict()
    ficha = {
        "id": r.cuaderno_id, "nombre": k.denominacion, "entidad": k.entidad, "contratista": k.contratista,
        "provincia": k.provincia, "distrito": k.distrito, "cui": None if pd.isna(k.cui) else k.cui,
        "primer_asiento": str(pd.Timestamp(k.primer_asiento).date()), "ultimo_asiento": str(pd.Timestamp(k.ultimo_asiento).date()),
        "riesgo": {"probabilidad": round(float(r.p), 4), "nivel": r.nivel,
                   "tasa_observada_nivel": niv_aqp[r.nivel]["tasa_observada"],
                   "veces_tasa_base": round(float(r.p) / base_aqp, 1), "razones": razones, "a_favor": calma},
        "consultas_resumen": {e: int(estados.get(e, 0)) for e in ("A tiempo", "Tarde", "En plazo", "Sin respuesta en el cuaderno")},
        "consultas": consultas, "hitos": hitos,
        "meses": [{"mes": m, **{c2: int(v) for c2, v in row.items()}} for m, row in meses.iterrows()],
    }
    (salida / f"{r.cuaderno_id}.json").write_text(json.dumps(ficha, ensure_ascii=False), encoding="utf-8")
    lista.append({"id": r.cuaderno_id, "nombre": k.denominacion, "entidad": k.entidad, "provincia": k.provincia,
                  "distrito": k.distrito, "probabilidad": ficha["riesgo"]["probabilidad"], "nivel": r.nivel,
                  "consultas_vencidas": ficha["consultas_resumen"]["Sin respuesta en el cuaderno"],
                  "consultas_tarde": ficha["consultas_resumen"]["Tarde"], "razon": razones[0]["frase"] if razones else ""})
lista.sort(key=lambda x: -x["probabilidad"])
(C.WEB_DATOS / "obras.json").write_text(json.dumps(lista, ensure_ascii=False), encoding="utf-8")

ra = met["resultados"]["arequipa"]["modelos"]
resumen = {
    "corte": str(corte.date()), "fuente": "OECE · Cuaderno de obra digital (datos abiertos), asientos 2024-06 a 2026-08",
    "obras": len(lista), "por_nivel": pd.Series([x["nivel"] for x in lista]).value_counts().to_dict(),
    "consultas_arequipa": plz["arequipa"], "plazos": plz["plazos"],
    "evaluacion": {"modelo": ra["M Caja Negra (LightGBM + consultas)"], "regla": ra["B1 Regla: consultas vencidas"],
                   "sin_consultas": ra["B3 LightGBM sin consultas"], "logistica": ra["B2 Regresión logística"],
                   "prevalencia": met["resultados"]["arequipa"]["prevalencia"],
                   "aporte_consultas": met["resultados"]["arequipa"]["aporte_consultas_pr_auc"],
                   "anticipacion": met["anticipacion"]["arequipa"], "niveles": met["niveles"]["arequipa"],
                   "particion": met["particion"]},
    "emparejador": emp["evaluacion"]["prueba"],
}
(C.WEB_DATOS / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({"obras": len(lista), "por_nivel": resumen["por_nivel"], "top": lista[:5]}, ensure_ascii=False, indent=1))
