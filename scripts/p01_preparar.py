"""Paso 1. Carga los asientos y cuadernos del cuaderno de obra digital (OECE) y deja solo lo necesario.

Entrada : datos depurados del OECE (asiento.parquet, cuaderno.parquet; ver config.FUENTE).
Salida  : datos/asientos.parquet, datos/cuadernos.parquet, resultados/p01_resumen.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import duckdb  # noqa: E402

from caja_negra import config as C  # noqa: E402

con = duckdb.connect()
con.sql(f"""
copy (
  select cuaderno_id, nro_asiento, fecha::date fecha, rol, tipo_std, titulo, descripcion
  from '{C.ASIENTOS_FUENTE.as_posix()}'
  where fecha <= date '{C.FIN_DATOS.date()}'
) to '{(C.TRABAJO / "asientos.parquet").as_posix()}' (format parquet)""")

con.sql(f"""
copy (
  select c.cuaderno_id, c.dep_code, c.departamento, c.provincia, c.distrito, c.entidad, c.contratista,
         c.denominacion, c.cui, c.historia_completa, c.primer_asiento, c.ultimo_asiento,
         least(c.f_culminacion, c.f_recepcion, c.f_cierre) f_fin_obra,
         e.f_evento
  from '{C.CUADERNOS_FUENTE.as_posix()}' c
  left join (select cuaderno_id, min(fecha) f_evento from '{(C.TRABAJO / "asientos.parquet").as_posix()}'
             where tipo_std in {C.TIPOS_EVENTO} group by 1) e using (cuaderno_id)
) to '{(C.TRABAJO / "cuadernos.parquet").as_posix()}' (format parquet)""")

A, K = (C.TRABAJO / "asientos.parquet").as_posix(), (C.TRABAJO / "cuadernos.parquet").as_posix()
r = {}
for ambito, filtro in (("nacional", "true"), ("arequipa", f"k.dep_code = '{C.AREQUIPA}'")):
    q = con.sql(f"""
      select count(*) asientos, count(distinct a.cuaderno_id) cuadernos,
             count(*) filter (where tipo_std = 'CONSULTAS') consultas,
             count(*) filter (where tipo_std = 'CONSULTAS' and rol = 'SOEC_RESI') consultas_residente,
             count(*) filter (where tipo_std = 'RESPUESTAS_CONSULTAS') respuestas,
             min(fecha)::varchar primera_fecha, max(fecha)::varchar ultima_fecha
      from '{A}' a join '{K}' k using (cuaderno_id) where {filtro}""").df().iloc[0].to_dict()
    q["cuadernos_con_evento"] = con.sql(f"select count(*) from '{K}' k where f_evento is not null and {filtro}").fetchone()[0]
    r[ambito] = {k: (int(v) if hasattr(v, "__int__") and not isinstance(v, str) else v) for k, v in q.items()}
(C.RESULTADOS / "p01_resumen.json").write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(r, ensure_ascii=False, indent=1))
