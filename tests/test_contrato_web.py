"""Contrato entre el pipeline (scripts/p05_exportar.py) y la web (web/js): lo que la interfaz lee debe existir y ser coherente."""
import json
import re
from pathlib import Path

import pytest

DATOS = Path(__file__).resolve().parents[1] / "web" / "data"
ESQUEMA_WEB = int(re.search(r"ESQUEMA = (\d+)", (DATOS.parent / "js" / "datos.js").read_text(encoding="utf-8")).group(1))


def leer(nombre):
    return json.loads((DATOS / nombre).read_text(encoding="utf-8"))


META, OBRAS, MODELO, RESUMEN = leer("meta.json"), leer("obras.json"), leer("modelo.json"), leer("resumen.json")
FICHAS = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (DATOS / "obra").glob("*.json")}


def test_esquema_coincide_con_la_web():
    assert META["esquema"] == ESQUEMA_WEB
    assert META["obras"] == len(OBRAS) == RESUMEN["obras"]


def test_una_ficha_por_obra():
    assert {o["id"] for o in OBRAS} == set(FICHAS)


def test_lista_ordenada_y_niveles_coherentes():
    u_alto, u_medio = MODELO["niveles"]["umbral_alto"], MODELO["niveles"]["umbral_medio"]
    probs = [o["probabilidad"] for o in OBRAS]
    assert probs == sorted(probs, reverse=True)
    for o in OBRAS:
        assert 0 <= o["probabilidad"] <= 1
        # la probabilidad publicada se redondea a 4 decimales
        if abs(o["probabilidad"] - u_alto) > 1e-4 and abs(o["probabilidad"] - u_medio) > 1e-4:
            esperado = "ALTO" if o["probabilidad"] >= u_alto else "MEDIO" if o["probabilidad"] >= u_medio else "BAJO"
            assert o["nivel"] == esperado, o["id"]
    conteo = {k: sum(o["nivel"] == k for o in OBRAS) for k in ("ALTO", "MEDIO", "BAJO")}
    assert conteo == {k: RESUMEN["por_nivel"].get(k, 0) for k in conteo}


@pytest.mark.parametrize("id_", sorted(FICHAS)[:40])
def test_ficha_completa(id_):
    f = FICHAS[id_]
    r = f["riesgo"]
    assert r["historia"] and r["historia"][-1]["p"] == pytest.approx(r["probabilidad"], abs=1e-4)
    assert len(r["aportes"]) <= 8
    pesos = [abs(a["peso"]) for a in r["aportes"]]
    assert pesos == sorted(pesos, reverse=True)
    assert len(f["indicadores"]) == 12
    assert sum(f["consultas_resumen"].values()) == len(f["consultas"])
    for c in f["consultas"]:
        assert c["plazo"] in (5, 21)
        assert (c["respuesta"] is None) == (c["estado"] in ("Sin respuesta en el cuaderno", "En plazo"))


def test_modelo_explica_lo_que_muestra():
    catalogo = {c["variable"] for c in MODELO["catalogo"]}
    assert len(catalogo) == META["modelo"]["indicadores"] == 53
    assert sum(MODELO["importancia_grupo"].values()) == pytest.approx(100, abs=0.5)
    for f in FICHAS.values():
        assert {a["variable"] for a in f["riesgo"]["aportes"]} <= catalogo
        assert {i["variable"] for i in f["indicadores"]} <= catalogo
    for k in ("platt", "base_logit", "arboles", "hiperparametros", "ablacion", "resultados", "particion"):
        assert k in MODELO


def test_sin_datos_personales_publicados():
    persona = re.compile(r"\b(?:Ing|Arq|Dr|Lic)\.\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+")
    for f in FICHAS.values():
        for t in [c["texto"] for c in f["consultas"]] + [h["texto"] for h in f["hitos"]]:
            assert not persona.search(t or "")
            assert not re.search(r"[\w.+-]+@[\w-]+\.\w", t or "")
