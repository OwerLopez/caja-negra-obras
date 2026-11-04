"""Reglas de lectura del texto: citas entre asientos, ruta de la consulta y anonimización."""
import pytest

from caja_negra.texto import anonimizar, cita_anterior, refs_asiento, refs_consulta, ruta_proyectista, sin_referencias


@pytest.mark.parametrize("texto, esperado", [
    ("En atención al asiento N° 157 del residente", [157]),
    ("Se absuelven los asientos N° 118 y 122", [118, 122]),
    ("según el asiento del cuaderno de obra N° 400", [400]),
    ("ver cuaderno de obra N° 113", [113]),
    ("Sin referencia alguna", []),
])
def test_refs_asiento(texto, esperado):
    assert refs_asiento(texto) == esperado


def test_refs_consulta_lista():
    assert refs_consulta("Respuesta a las consultas 34, 35 y 36") == [34, 35, 36]
    assert refs_consulta("CONSULTA TÉCNICA N° 7") == [7]


def test_cita_anterior_y_ruta():
    assert cita_anterior("Respecto al asiento anterior, se indica")
    assert not cita_anterior("asiento N° 12")
    assert ruta_proyectista("La consulta se elevó a la entidad para opinión del proyectista")
    assert not ruta_proyectista("Se responde directamente en obra")


def test_sin_referencias_borra_los_numeros():
    t = sin_referencias("Respuesta al asiento N° 157 y a la consulta N° 4")
    assert "157" not in t and "4" not in t


@pytest.mark.parametrize("entrada, prohibido", [
    ("El Ing. Juan Pérez Rojas dispone", "Juan"),
    ("Residente de obra: Carlos Mamani Quispe", "Mamani"),
    ("DNI 45678912 del residente", "45678912"),
    ("CIP 123456", "123456"),
    ("escribir a residente@empresa.com.pe", "@"),
    ("llamar al 987 654 321", "987"),
])
def test_anonimizar_no_deja_datos_personales(entrada, prohibido):
    assert prohibido not in anonimizar(entrada)


def test_anonimizar_conserva_lo_tecnico_y_recorta():
    t = anonimizar("Se requiere concreto f'c=210 kg/cm2 en la losa del bloque 3")
    assert "210" in t and "bloque 3" in t
    largo = anonimizar("palabra " * 200, limite=50)
    assert len(largo) <= 50 and largo.endswith("…")
