"""Consistencia del catálogo único de indicadores (alimenta el modelo, la web y el informe)."""
import pytest

from caja_negra.indicadores import CATALOGO, CATEGORICAS, GRUPOS, frase, por_grupo


def test_catalogo_completo():
    assert len(CATALOGO) == 53
    assert {v[0] for v in CATALOGO.values()} == set(GRUPOS)
    assert sum(len(por_grupo([g])) for g in GRUPOS) == len(CATALOGO)
    assert set(CATEGORICAS) <= set(CATALOGO)


@pytest.mark.parametrize("nombre", [k for k in CATALOGO if k not in CATEGORICAS])
def test_cada_indicador_tiene_formula_fuente_razon_y_frase(nombre):
    grupo, formula, fuente, por_que, _ = CATALOGO[nombre]
    assert formula and fuente and por_que
    for valor in (0.0, 1.0, 17.0, -3.0, 0.35):
        texto = frase(nombre, valor)
        assert isinstance(texto, str) and texto and "nan" not in texto.lower()


def test_frases_en_unidades_humanas():
    assert frase("log_monto_contratado", 15.0) == "Monto contratado del orden de S/ 3.3 millones"
    assert frase("dias_restantes_plazo", -10) == "Su plazo original venció hace 10 días"
    assert frase("plazo_vs_avance", 35) == "Consumió 35 puntos más de plazo que de avance"
