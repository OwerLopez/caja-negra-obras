"""Lectura del texto de los asientos: referencias entre asientos, ruta de la consulta y anonimización."""
import re

_NUM = r"(?:n(?:ro|um|[uú]mero)?\s*\.?\s*[°ºª]?\s*\.?\s*[°ºª]?|#|no\.)"

# «asiento N° 45», «asientos N° 118 y 122», «asiento del cuaderno de obra N° 400»
RE_ASIENTO = re.compile(
    r"\basientos?\b(?:\s+(?:del?|de\s+la)\s+(?:cuaderno(?:\s+de\s+obra)?(?:\s+digital)?|obra|cod|residente|"
    r"supervis[a-zó]+|contratista|residencia)){0,2}\s*" + _NUM + r"?\s*(\d{1,5})(?!\d)"
    r"((?:\s*(?:,|y|e|al|-)\s*" + _NUM + r"?\s*\d{1,5}(?!\d))*)", re.I)
# «cuaderno de obra N° 113» usado como número de asiento
RE_CUADERNO = re.compile(
    r"\bcuaderno(?:\s+(?:de(?:l)?\s+)?(?:obra|residente(?:\s+de\s+obra)?))?\s*" + _NUM + r"\s*(\d{1,5})(?!\d)"
    r"((?:\s*(?:,|y|e)\s*" + _NUM + r"?\s*\d{1,5}(?!\d))*)", re.I)
RE_ANTERIOR = re.compile(r"\basiento\s+(?:anterior|precedente|previo|inmediato\s+anterior)\b", re.I)
# «consulta N° 01», «consultas 34, 35 y 36», «consulta técnica N° 7»
RE_CONSULTA = re.compile(
    r"\bconsultas?\s*(?:t[eé]cnicas?\s*|de\s+obra\s*)?" + _NUM + r"?\s*(\d{1,3})(?!\d)"
    r"((?:\s*(?:,|y|e)\s*" + _NUM + r"?\s*\d{1,3}(?!\d))*)", re.I)

# La consulta sigue la ruta larga (supervisor -> entidad -> proyectista) cuando el texto lo dice.
RE_RUTA_PROYECTISTA = re.compile(
    r"proyectista|modificaci[oó]n\s+del\s+expediente|elev(?:a|ó|ar|amos|ado)\s+(?:la\s+consulta\s+)?a\s+la\s+entidad|"
    r"remit(?:e|ió|imos|ido)\s+(?:la\s+consulta\s+)?a\s+la\s+entidad|opini[oó]n\s+de\s+la\s+entidad", re.I)


def _numeros(m):
    return [int(m.group(1))] + [int(x) for x in re.findall(r"\d{1,5}", m.group(2) or "")]


def refs_asiento(t):
    out = []
    for rx in (RE_ASIENTO, RE_CUADERNO):
        for m in rx.finditer(t):
            out += _numeros(m)
    return sorted(set(out))


def refs_consulta(t):
    out = []
    for m in RE_CONSULTA.finditer(t):
        out += _numeros(m)
    return sorted(set(out))


def cita_anterior(t):
    return bool(RE_ANTERIOR.search(t))


def ruta_proyectista(t):
    return bool(RE_RUTA_PROYECTISTA.search(t))


def sin_referencias(t):
    """Texto sin números de asiento ni de consulta: así el modelo semántico no puede «leer la respuesta»."""
    t = RE_ASIENTO.sub(" asiento ", t)
    t = RE_CUADERNO.sub(" cuaderno ", t)
    t = RE_CONSULTA.sub(" consulta ", t)
    return re.sub(r"\s+", " ", t).strip()


# --- anonimización para lo que se publica en el prototipo ---
_TITULO = r"(?i:ing|arq|sr|sra|srta|dr|lic|bach|t[eé]c|abog|econ|cpc|mg|msc)(?:\.|°|º)?"
_NOMBRE = r"[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+"
_INICIAL = r"[A-ZÁÉÍÓÚÑ]\.\s*"
RE_PERSONA = re.compile(r"\b" + _TITULO + r"(?:(?<=[.°º])\s*|\s+)(?:" + _INICIAL + r"|" + _NOMBRE + r"\s+){0,4}" + _NOMBRE + r"\b")
RE_CARGO_NOMBRE = re.compile(
    r"\b((?i:residente|supervisor|inspector|jefe\s+de\s+supervisi[oó]n|especialista))((?i:\s+de\s+obra))?\s*[:,]?\s+"
    r"(?:" + _NOMBRE + r"\s+){1,3}" + _NOMBRE + r"\b")
RE_DNI = re.compile(r"\b(?:dni|d\.n\.i\.?|c\.?e\.?)\s*[:n°º.]*\s*\d{8}\b|\b\d{8}\b", re.I)
RE_CIP = re.compile(r"\b(?:cip|cap|reg\.?\s*cip)\s*[:n°º.]*\s*\d{3,7}\b", re.I)
RE_CORREO = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b")
RE_TELEFONO = re.compile(r"\b9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b")


def anonimizar(t, limite=420):
    t = re.sub(r"\s+", " ", t or "").strip()
    t = RE_CORREO.sub("[correo]", t)
    t = RE_CIP.sub("[colegiatura]", t)
    t = RE_DNI.sub("[documento]", t)
    t = RE_TELEFONO.sub("[teléfono]", t)
    t = RE_PERSONA.sub("[persona]", t)
    t = RE_CARGO_NOMBRE.sub(lambda m: m.group(1) + (m.group(2) or "") + " [persona]", t)
    return t if len(t) <= limite else t[: limite - 1].rstrip() + "…"
