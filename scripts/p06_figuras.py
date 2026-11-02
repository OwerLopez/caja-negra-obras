"""Paso 6. Gráficos de resultados para el informe y las diapositivas (a partir de resultados/*.json).

Salida: informe/figuras/g*.png
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from caja_negra import config as C  # noqa: E402
from caja_negra.indicadores import GRUPOS  # noqa: E402

FIG = C.RAIZ / "informe" / "figuras"
TINTA, SUAVE, SELLO, ALTO, MEDIO, BAJO, LINEA = "#1c2a39", "#4b5a6a", "#2b4c9b", "#b42318", "#9a6410", "#2f6f4b", "#cfd6dd"
plt.rcParams.update({"font.family": "Arial", "font.size": 11, "axes.edgecolor": LINEA, "axes.labelcolor": TINTA,
                     "xtick.color": SUAVE, "ytick.color": SUAVE, "axes.spines.top": False, "axes.spines.right": False,
                     "figure.dpi": 200, "savefig.bbox": "tight"})
emp = json.loads((C.RESULTADOS / "p02_emparejador.json").read_text(encoding="utf-8"))
plz = json.loads((C.RESULTADOS / "p03_plazos.json").read_text(encoding="utf-8"))
mod = json.loads((C.RESULTADOS / "p04_modelo.json").read_text(encoding="utf-8"))


def coma(t):
    return t.replace(".", ",")


coma_ejes = matplotlib.ticker.FuncFormatter(lambda x, _: coma(f"{x:g}"))


def guardar(fig, nombre):
    fig.savefig(FIG / f"{nombre}.png")
    plt.close(fig)
    print("ok", nombre)


# g01 Partición temporal
fig, ax = plt.subplots(figsize=(9, 2.6))
filas = [("Asientos publicados por el OECE", "2024-06-01", "2026-08-31", "#9aa7b4"),
         (f"Entrenamiento · {mod['particion']['entrenamiento']['filas']:,} obra-mes".replace(",", " "), "2024-06-30", "2025-09-30", BAJO),
         (f"Validación · {mod['particion']['validacion']['filas']:,}".replace(",", " "), "2025-10-31", "2025-12-31", SELLO),
         (f"Prueba · {mod['particion']['prueba']['filas']:,} (Arequipa {mod['resultados']['arequipa']['filas']})".replace(",", " "), "2026-01-31", "2026-06-30", ALTO),
         ("60 días de horizonte observados", "2026-06-30", "2026-08-29", "#e3b4ae")]
for i, (t, a, b, c) in enumerate(filas):
    a, b = pd.Timestamp(a), pd.Timestamp(b)
    ax.barh(len(filas) - 1 - i, (b - a).days, left=mdates.date2num(a), color=c, height=0.55)
    ax.text(mdates.date2num(a), len(filas) - 1 - i + 0.42, t, fontsize=9.5, color=TINTA, va="bottom")
ax.xaxis_date()
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
ax.set_yticks([])
ax.set_ylim(-0.5, len(filas) + 0.1)
ax.spines["left"].set_visible(False)
ax.set_title("El modelo aprende del pasado y se evalúa en meses que nunca vio", loc="left", fontsize=12, color=TINTA)
guardar(fig, "g01_particion_temporal")

# g02 Días hasta la respuesta (Arequipa)
Q = pd.read_parquet(C.TRABAJO / "consultas_auditadas.parquet")
r = Q[(Q.dep_code == C.AREQUIPA) & Q.f_r.notna()]
fig, ax = plt.subplots(figsize=(8, 3.4))
d = r.dias_respuesta.clip(0, 60)
ax.hist(d, bins=np.arange(0, 62, 2), color=SELLO, edgecolor="white")
for x, t in ((C.PLAZO_DIRECTO, "5 días: plazo del supervisor"), (C.PLAZO_PROYECTISTA, "21 días: con entidad y proyectista")):
    ax.axvline(x + 0.5, color=ALTO, lw=1.5, ls="--")
    ax.text(x + 1.2, ax.get_ylim()[1] * 0.92, t, color=ALTO, fontsize=9.5)
ax.set_xlabel("Días calendario entre la consulta y su respuesta (60 = 60 o más)")
ax.set_ylabel("Consultas")
ax.set_title(f"Arequipa: {len(r):,} consultas con respuesta enlazada; mediana {r.dias_respuesta.median():.0f} días".replace(",", " "),
             loc="left", fontsize=12, color=TINTA)
guardar(fig, "g02_dias_respuesta")

# g03 Estado de las consultas del residente (Arequipa)
v = plz["arequipa"]["veredicto"]
orden = ["A tiempo", "En plazo", "Tarde", "Sin respuesta en el cuaderno"]
cols = [BAJO, "#7aa58a", ALTO, MEDIO]
fig, ax = plt.subplots(figsize=(8, 1.7))
izq = 0
tot = sum(v.values())
for k, c in zip(orden, cols):
    ax.barh(0, v.get(k, 0), left=izq, color=c, height=0.6)
    if v.get(k, 0) / tot > 0.04:
        ax.text(izq + v[k] / 2, 0, f"{k}\n{v[k]:,} ({100 * v[k] / tot:.0f} %)".replace(",", " "), ha="center", va="center",
                color="white", fontsize=9.5)
    izq += v.get(k, 0)
ax.set_xlim(0, tot)
ax.axis("off")
ax.set_title(f"Estado de las {tot:,} consultas del residente en Arequipa al {plz['corte']}".replace(",", " "), loc="left", fontsize=12, color=TINTA)
guardar(fig, "g03_estado_consultas")

# g04 Emparejador: exactitud en Arequipa
e = emp["evaluacion"]["prueba"]
nombres = ["Elegir al azar", "Solo similitud de texto", "Regla: la más reciente", "IA (Caja Negra)"]
vals = [e["azar"], e["solo_similitud_texto"], e["regla_mas_reciente"], e["modelo_ia"]]
fig, ax = plt.subplots(figsize=(8, 3))
b = ax.barh(nombres, vals, color=["#9aa7b4", "#9aa7b4", "#9aa7b4", SELLO], height=0.6)
lo, hi = e["modelo_ia_ic95"]
ax.errorbar(e["modelo_ia"], 3, xerr=[[e["modelo_ia"] - lo], [hi - e["modelo_ia"]]], color=TINTA, capsize=4)
for i, x in enumerate(vals):
    ax.text(x + 0.012, i, coma(f"{100 * x:.1f} %"), va="center", color=TINTA)
ax.set_xlim(0, 0.85)
ax.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
ax.set_title(f"¿Elige la consulta correcta? {e['respuestas']:,} respuestas de Arequipa con el número borrado".replace(",", " "),
             loc="left", fontsize=12, color=TINTA)
guardar(fig, "g04_emparejador")

# g05 Comparación de modelos (Arequipa): PR-AUC con IC95
ra = mod["resultados"]["arequipa"]["modelos"]
claves = list(ra)
etq = ["B0 Tasa base (azar)", "B1 Regla: consultas vencidas", "B2 Regresión logística", "B3 LightGBM solo cuaderno",
       "M1 LightGBM cuaderno + consultas", "M Caja Negra (8 grupos)"]
assert len(etq) == len(claves), claves
fig, ax = plt.subplots(figsize=(8, 3.9))
for i, k in enumerate(claves):
    m = ra[k]
    c = SELLO if k == "M Caja Negra" else "#7f9bd6" if k.startswith("M1") else "#9aa7b4"
    ax.barh(i, m["pr_auc"], color=c, height=0.6)
    ax.errorbar(m["pr_auc"], i, xerr=[[m["pr_auc"] - m["pr_auc_ic95"][0]], [m["pr_auc_ic95"][1] - m["pr_auc"]]], color=TINTA, capsize=3)
    ax.text(m["pr_auc_ic95"][1] + 0.008, i, coma(f"{m['pr_auc']:.3f}"), va="center", color=TINTA)
ax.set_yticks(range(len(claves)), etq)
ax.set_xlabel("PR-AUC en la prueba de Arequipa (enero a junio 2026), con intervalo de confianza del 95 %")
ax.set_xlim(0, 0.45)
ax.xaxis.set_major_formatter(coma_ejes)
ax.set_title("Ordenar obras por riesgo: Caja Negra frente a sus comparadores", loc="left", fontsize=12, color=TINTA)
guardar(fig, "g05_comparacion_modelos")

# g06 Tasa observada por nivel (Arequipa)
nv = {x["nivel"]: x for x in mod["niveles"]["arequipa"]}
fig, ax = plt.subplots(figsize=(6.5, 3.2))
orden = ["BAJO", "MEDIO", "ALTO"]
ax.bar(["Riesgo bajo", "Riesgo medio", "Riesgo alto"], [nv[k]["tasa_observada"] for k in orden], color=[BAJO, MEDIO, ALTO], width=0.6)
for i, k in enumerate(orden):
    ax.text(i, nv[k]["tasa_observada"] + 0.004, f"{100 * nv[k]['tasa_observada']:.1f} %\n({nv[k]['eventos']} de {nv[k]['filas']})",
            ha="center", color=TINTA, fontsize=9.5)
prev = mod["resultados"]["arequipa"]["prevalencia"]
ax.axhline(prev, color=SUAVE, ls="--", lw=1)
ax.text(2.35, prev + 0.003, coma(f"promedio {100 * prev:.1f} %"), color=SUAVE, fontsize=9, ha="right")
ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
ax.set_ylim(0, 0.2)
ax.set_ylabel("Obras-mes que cayeron en atraso en 60 días")
ax.set_title("Lo que pasó después, según el nivel que asignó el sistema", loc="left", fontsize=12, color=TINTA)
guardar(fig, "g06_niveles")

# g07 Calibración (nacional, deciles)
cal = pd.DataFrame(mod["calibracion_nacional"])
fig, ax = plt.subplots(figsize=(4.6, 4.2))
mx = max(cal.prob_media.max(), cal.tasa_observada.max()) * 1.1
ax.plot([0, mx], [0, mx], color=LINEA, lw=1)
ax.plot(cal.prob_media, cal.tasa_observada, "o-", color=SELLO)
ax.set_xlabel("Probabilidad que dijo el sistema")
ax.set_ylabel("Proporción que realmente se atrasó")
ax.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
ax.set_title("Calibración por deciles (prueba nacional)", loc="left", fontsize=12, color=TINTA)
guardar(fig, "g07_calibracion")

# g08 Importancia por grupo
ig = sorted(mod["importancia_grupo"].items(), key=lambda x: x[1])
fig, ax = plt.subplots(figsize=(8, 3.6))
ax.barh([GRUPOS[g] for g, _ in ig], [v for _, v in ig], color=SELLO, height=0.6)
for i, (_, v) in enumerate(ig):
    ax.text(v + 0.3, i, coma(f"{v:.1f} %"), va="center", color=TINTA)
ax.set_xlabel("% de la ganancia total de los árboles (gain)")
ax.set_xlim(0, max(v for _, v in ig) * 1.18)
ax.set_title("Qué grupos de indicadores usa más el modelo", loc="left", fontsize=12, color=TINTA)
guardar(fig, "g08_importancia_grupos")

# g09 Ablación por grupo
ab = mod["ablacion"]["por_grupo"]
orden = [g for g, _ in sorted(mod["importancia_grupo"].items(), key=lambda x: -x[1])]
fig, ax = plt.subplots(figsize=(8.5, 4))
ancho = 0.27
for j, (amb, col, nom) in enumerate((("validacion", "#9aa7b4", "Validación"), ("nacional", SELLO, "Prueba nacional"), ("arequipa", ALTO, "Prueba Arequipa"))):
    ax.bar(np.arange(len(orden)) + (j - 1) * ancho, [ab[g][amb]["caida"] for g in orden], ancho, color=col, label=nom)
ax.axhline(0, color=SUAVE, lw=0.8)
CORTO = {"actividad": "Actividad", "senales": "Señales\nformales", "consultas": "Consultas\ny plazos", "plazo": "Plazo y\navance",
         "contrato": "Contrato", "financiera": "Ejecución\nfinanciera", "historial": "Historial", "calendario": "Calendario"}
ax.set_xticks(range(len(orden)), [CORTO[g] for g in orden], fontsize=9)
ax.set_ylabel("Caída del PR-AUC al quitar el grupo")
ax.yaxis.set_major_formatter(coma_ejes)
ax.legend(frameon=False, fontsize=9)
ax.set_title("Ablación: cuánto se pierde al reentrenar sin cada grupo (positivo = el grupo ayuda)", loc="left", fontsize=11.5, color=TINTA)
guardar(fig, "g09_ablacion")

# g10 Ejemplo resuelto: de la base a la probabilidad (cascada de contribuciones)
web = C.RAIZ / "web" / "data"
mj = json.loads((web / "modelo.json").read_text(encoding="utf-8"))
top = json.loads((web / "obras.json").read_text(encoding="utf-8"))[0]
ob = json.loads((web / "obra" / f"{top['id']}.json").read_text(encoding="utf-8"))
r = ob["riesgo"]
z = np.log(r["probabilidad"] / (1 - r["probabilidad"]))
F = (z - mj["platt"]["B"]) / mj["platt"]["A"]
ap = r["aportes"]
resto = F - mj["base_logit"] - sum(a["peso"] for a in ap)
pasos = [("Base común del modelo (φ0)", mj["base_logit"])] + [(a["frase"], a["peso"]) for a in ap] + [(f"Otros {len(mj['catalogo']) - len(ap)} indicadores", resto)]
fig, ax = plt.subplots(figsize=(9, 5.2))
acum = 0
for i, (t, v) in enumerate(pasos):
    ini = acum if i else 0
    acum = acum + v if i else v
    c = TINTA if i == 0 else (ALTO if v > 0 else BAJO)
    ax.barh(len(pasos) - i, acum - ini, left=ini, color=c, height=0.6)
    ax.text(min(ini, acum) - 0.05, len(pasos) - i, (t if len(t) < 58 else t[:55] + "…"), ha="right", va="center", fontsize=8.6, color=TINTA)
    ax.text(max(ini, acum) + 0.05, len(pasos) - i, coma(f"{v:+.2f}"), va="center", fontsize=8.6, color=SUAVE)
ax.barh(0, F, color=SELLO, height=0.6)
ax.text(F - 0.05, 0, coma(f"F(x) = {F:.2f}  →  p = σ({mj['platt']['A']:.3f}·F + {mj['platt']['B']:.3f}) = {100 * r['probabilidad']:.1f} %"),
        ha="right", va="center", fontsize=9, color=TINTA, fontweight="bold")
ax.axvline(0, color=SUAVE, lw=0.8)
ax.set_xlim(mj["base_logit"] - 7.5, 1.2)
ax.set_yticks([])
ax.spines["left"].set_visible(False)
ax.set_xlabel("Puntaje del modelo en escala logit")
ax.set_title("Ejemplo resuelto: cómo se arma el riesgo de la obra con mayor probabilidad", loc="left", fontsize=11.5, color=TINTA)
guardar(fig, "g10_ejemplo_cascada")

# g11 Los 15 indicadores más importantes
imp = sorted(mod["importancia"].items(), key=lambda x: -x[1])[:15][::-1]
from caja_negra.indicadores import CATALOGO  # noqa: E402
paleta = {"actividad": "#2b4c9b", "senales": "#b42318", "consultas": "#9a6410", "plazo": "#2f6f4b", "contrato": "#6b4c9a",
          "financiera": "#1f7a8c", "historial": "#7a5c3a", "calendario": "#8a8f98"}
fig, ax = plt.subplots(figsize=(8, 5))
ax.barh([k for k, _ in imp], [v for _, v in imp], color=[paleta[CATALOGO[k][0]] for k, _ in imp], height=0.65)
for i, (_, v) in enumerate(imp):
    ax.text(v + 0.1, i, coma(f"{v:.1f} %"), va="center", fontsize=9, color=TINTA)
ax.tick_params(axis="y", labelsize=9)
from matplotlib.patches import Patch  # noqa: E402
usados = list(dict.fromkeys(CATALOGO[k][0] for k, _ in imp[::-1]))
ax.legend(handles=[Patch(color=paleta[g], label=GRUPOS[g]) for g in usados], frameon=False, fontsize=8, loc="lower right")
ax.set_xlabel("% de la ganancia total (gain)")
ax.set_title("Los 15 indicadores con más peso en el modelo", loc="left", fontsize=12, color=TINTA)
guardar(fig, "g11_top_indicadores")
