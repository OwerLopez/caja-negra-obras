"""Catálogo único de indicadores del predictor: grupo, fórmula, fuente, razón y frase para el usuario.

Este catálogo alimenta el entrenamiento (p04), las explicaciones del prototipo (p05) y las tablas del informe.
Toda variable de la fila (obra, T) usa solo información con fecha <= T (fin de mes de corte).
"""
import math

GRUPOS = {
    "actividad": "Actividad del cuaderno",
    "senales": "Señales formales del cuaderno",
    "consultas": "Consultas y plazos legales",
    "plazo": "Plazo y avance físico",
    "contrato": "Contrato y entidad",
    "financiera": "Ejecución financiera",
    "historial": "Historial de entidad y contratista",
    "calendario": "Calendario y clima",
}


def _p(v):
    return f"{100 * v:.0f} %"


# nombre: (grupo, fórmula, fuente, por qué explica un evento de plazo, frase(valor))
CATALOGO = {
    # ---------------- actividad del cuaderno ----------------
    "asientos_30d": ("actividad", "Nº de asientos con fecha en (T−30, T]", "Cuaderno OECE",
                     "El ritmo de anotación refleja cuánta obra se está ejecutando y controlando",
                     lambda v: f"{v:.0f} anotaciones en el último mes"),
    "asientos_90d": ("actividad", "Nº de asientos con fecha en (T−90, T]", "Cuaderno OECE",
                     "Ventana más estable que la de 30 días", lambda v: f"{v:.0f} anotaciones en los últimos 90 días"),
    "asientos_total": ("actividad", "Nº de asientos con fecha ≤ T", "Cuaderno OECE",
                       "Tamaño e historia documental de la obra", lambda v: f"{v:.0f} anotaciones desde el inicio"),
    "dias_sin_asientos": ("actividad", "T − fecha del último asiento (días)", "Cuaderno OECE",
                          "Un cuaderno que deja de escribirse suele anticipar una obra detenida",
                          lambda v: "Tuvo anotaciones en la última semana del mes" if v <= 7 else f"Lleva {v:.0f} días sin anotaciones"),
    "prop_supervisor_90d": ("actividad", "Asientos del supervisor ÷ asientos en (T−90, T]", "Cuaderno OECE",
                            "Si el supervisor escribe más que el residente, suele estar ordenando u observando",
                            lambda v: f"El supervisor escribió el {_p(v)} de las anotaciones recientes"),
    "ritmo_30_vs_90": ("actividad", "asientos_30d ÷ (asientos_90d ÷ 3)", "Cuaderno OECE",
                       "Tendencia: < 1 indica que la actividad está cayendo",
                       lambda v: f"Ritmo del último mes: {v:.1f} veces el promedio trimestral"),
    # ---------------- señales formales ----------------
    "suspensiones": ("senales", "Nº acumulado de asientos tipo «suspensión del plazo»", "Cuaderno OECE",
                     "Una suspensión es una interrupción formal de la obra", lambda v: f"{v:.0f} anotaciones de suspensión del plazo"),
    "ampliaciones": ("senales", "Nº acumulado de asientos tipo «ampliación de plazo» (ampliaciones previas)", "Cuaderno OECE",
                     "Las ampliaciones previas muestran que el plazo ya se tensionó antes", lambda v: f"{v:.0f} anotaciones de ampliación de plazo"),
    "adicionales": ("senales", "Nº acumulado de asientos tipo «adicionales»", "Cuaderno OECE",
                    "Los adicionales cambian el alcance y suelen alargar la obra", lambda v: f"{v:.0f} anotaciones de adicionales de obra"),
    "mayores_metrados": ("senales", "Nº acumulado de asientos tipo «mayores metrados»", "Cuaderno OECE",
                         "Más metrado que el previsto obliga a reprogramar", lambda v: f"{v:.0f} anotaciones de mayores metrados"),
    "riesgos": ("senales", "Nº acumulado de asientos tipo «riesgos»", "Cuaderno OECE",
                "Riesgos declarados por las partes", lambda v: f"{v:.0f} riesgos anotados"),
    "penalidades": ("senales", "Nº acumulado de asientos tipo «penalidades»", "Cuaderno OECE",
                    "La supervisión ya está aplicando o advirtiendo penalidades por retraso", lambda v: f"{v:.0f} anotaciones sobre penalidades"),
    "ordenes": ("senales", "Nº acumulado de asientos tipo «órdenes»", "Cuaderno OECE",
                "Órdenes del supervisor para corregir la ejecución", lambda v: f"{v:.0f} órdenes del supervisor"),
    "valorizaciones": ("senales", "Nº acumulado de asientos tipo «valorizaciones»", "Cuaderno OECE",
                       "Regularidad del avance pagado", lambda v: f"{v:.0f} valorizaciones anotadas"),
    "cambio_personal": ("senales", "Nº acumulado de asientos tipo «personal clave»", "Cuaderno OECE",
                        "Cambios de residente o especialistas desordenan la obra", lambda v: f"{v:.0f} anotaciones de cambio de personal clave"),
    "alertas_90d": ("senales", "Suspensiones + ampliaciones + riesgos en (T−90, T]", "Cuaderno OECE",
                    "Concentración reciente de señales de problema",
                    lambda v: f"{v:.0f} anotaciones de suspensión, ampliación o riesgo en 90 días"),
    # ---------------- consultas y plazos (aporte propio) ----------------
    "consultas": ("consultas", "Nº de consultas del residente con fecha ≤ T", "Cuaderno OECE + motor de plazos",
                  "Cada consulta es una duda que el expediente no resolvió", lambda v: f"{v:.0f} consultas del residente en total"),
    "consultas_90d": ("consultas", "Nº de consultas con fecha en (T−90, T]", "Cuaderno OECE",
                      "Muchas consultas recientes indican problemas de diseño activos", lambda v: f"{v:.0f} consultas nuevas en 90 días"),
    "consultas_vencidas": ("consultas", "Consultas sin respuesta conocida en T con (T − fecha) > plazo legal", "Emparejador + motor de plazos",
                           "Una consulta vencida habilita al contratista a pedir ampliación (RLGCP 190.4)",
                           lambda v: f"{v:.0f} consultas con plazo vencido y sin respuesta en el cuaderno"),
    "consultas_en_plazo": ("consultas", "Consultas sin respuesta en T con (T − fecha) ≤ plazo", "Emparejador + motor de plazos",
                           "Dudas abiertas que todavía pueden atenderse a tiempo", lambda v: f"{v:.0f} consultas esperando dentro del plazo"),
    "max_dias_espera": ("consultas", "máx(T − fecha) entre consultas sin respuesta en T", "Emparejador + motor de plazos",
                        "La consulta más antigua sin resolver mide cuán trabada está la obra",
                        lambda v: f"Una consulta espera respuesta desde hace {v:.0f} días"),
    "respondidas_tarde": ("consultas", "Respuestas conocidas en T con días > plazo", "Emparejador + motor de plazos",
                          "Historial de incumplimiento de la supervisión o la entidad", lambda v: f"{v:.0f} consultas respondidas fuera de plazo"),
    "respondidas": ("consultas", "Respuestas enlazadas conocidas en T", "Emparejador", "Capacidad de respuesta registrada",
                    lambda v: f"{v:.0f} consultas con respuesta registrada"),
    "mediana_dias_respuesta": ("consultas", "Mediana de (fecha respuesta − fecha consulta) de las respondidas en T", "Emparejador + motor de plazos",
                               "Velocidad típica con que se destraban las dudas",
                               lambda v: "Ninguna consulta tiene respuesta registrada" if v < 0 else f"Las consultas se responden en {v:.0f} días (mediana)"),
    "pct_respondidas_tarde": ("consultas", "respondidas_tarde ÷ respondidas", "Emparejador + motor de plazos",
                              "Proporción de incumplimiento", lambda v: f"El {_p(v)} de las respuestas llegó fuera de plazo"),
    "meses_seguidos_vencidas": ("consultas", "Meses consecutivos hasta T con consultas_vencidas > 0", "Panel obra-mes",
                                "Persistencia: un problema que se arrastra mes a mes", lambda v: f"{v:.0f} meses seguidos con consultas vencidas"),
    # ---------------- plazo y avance físico ----------------
    "meses_desde_inicio": ("plazo", "(T − primer asiento) ÷ 30,4", "Cuaderno OECE", "Antigüedad de la obra",
                           lambda v: f"{v:.0f} meses de obra registrados"),
    "dias_desde_inicio_plazo": ("plazo", "T − fecha del asiento «inicio del plazo»", "Cuaderno OECE",
                                "Tiempo efectivo de ejecución", lambda v: f"{v:.0f} días desde el inicio del plazo"),
    "plazo_contractual_dias": ("plazo", "Plazo original de ejecución (días)", "INFOBRAS (dato fijo del contrato)",
                               "Obras con plazos más cortos o más largos tienen riesgos distintos", lambda v: f"Plazo contractual de {v:.0f} días"),
    "plazo_consumido": ("plazo", "(T − inicio de obra) ÷ plazo original", "INFOBRAS (fechas fijas) y T",
                        "Cuánto del plazo ya se gastó", lambda v: f"Ha consumido el {_p(v)} del plazo original"),
    "dias_restantes_plazo": ("plazo", "fin programado original − T (días; negativo = vencido)", "INFOBRAS (fecha fija)",
                             "Cerca del vencimiento el atraso se vuelve visible",
                             lambda v: f"Le quedan {v:.0f} días de plazo original" if v >= 0 else f"Su plazo original venció hace {-v:.0f} días"),
    "avance_reportado": ("plazo", "Último % de avance ejecutado leído del texto de valorizaciones con fecha ≤ T", "Cuaderno OECE (extracción de texto)",
                         "Avance físico real declarado en la obra", lambda v: f"Último avance reportado en el cuaderno: {v:.0f} %"),
    "brecha_reportada": ("plazo", "% programado − % ejecutado, leídos del último asiento con ambos datos ≤ T", "Cuaderno OECE (extracción de texto)",
                         "Atraso ya visible en las valorizaciones", lambda v: f"Brecha entre lo programado y lo ejecutado: {v:.0f} puntos"),
    "plazo_vs_avance": ("plazo", "100 × plazo_consumido − avance_reportado (puntos)", "INFOBRAS + cuaderno",
                        "Plazo consumido frente a avance físico: si el tiempo corre más rápido que la obra, se atrasa",
                        lambda v: f"Consumió {v:.0f} puntos más de plazo que de avance" if v >= 0 else f"Va {-v:.0f} puntos adelantada respecto del plazo"),
    # ---------------- contrato y entidad ----------------
    "log_monto_contratado": ("contrato", "ln(1 + monto contratado en soles)", "SEACE / CONOSCE",
                             "Obras grandes tienen más frentes y más riesgos", lambda v: f"Monto contratado del orden de S/ {math.expm1(v) / 1e6:.1f} millones"),
    "log_monto_viable": ("contrato", "ln(1 + monto viable de la inversión en soles)", "MEF Banco de Inversiones",
                         "Tamaño de la inversión total", lambda v: f"Inversión viable del orden de S/ {math.expm1(v) / 1e6:.1f} millones"),
    "es_consorcio": ("contrato", "1 si el contratista es un consorcio", "Cuaderno OECE",
                     "Los consorcios suman coordinación entre empresas", lambda v: "El contratista es un consorcio" if v >= 1 else "El contratista no es un consorcio"),
    "regimen_ley32069": ("contrato", "1 si la obra sigue la Ley 32069", "Fecha de los asientos", "Cambio de reglas de contratación en 2025",
                         lambda v: "Se rige por la Ley 32069" if v >= 1 else "Se rige por la Ley 30225"),
    "nivel_gobierno": ("contrato", "Nacional, regional o local", "MEF Banco de Inversiones", "Capacidad de gestión distinta por nivel",
                       lambda v: "Nivel de gobierno de la entidad"),
    "tipo_entidad": ("contrato", "Tipo de entidad contratante", "MEF / OECE", "Perfil de la entidad", lambda v: "Tipo de entidad contratante"),
    "sector": ("contrato", "Función o sector de la inversión", "MEF Banco de Inversiones", "Transporte, saneamiento, educación… se ejecutan distinto",
               lambda v: "Sector de la obra"),
    # ---------------- ejecución financiera ----------------
    "devengado_sobre_viable": ("financiera", "Devengado SIAF acumulado ≤ T ÷ monto viable", "MEF SIAF (mensual)",
                               "Ejecución financiera concreta frente al tamaño de la inversión",
                               lambda v: f"Se ha pagado el {_p(v)} del monto viable"),
    "devengado_3m": ("financiera", "Devengado SIAF en los 3 meses previos a T (soles)", "MEF SIAF",
                     "Si no fluye dinero, la obra se frena", lambda v: f"S/ {v / 1e6:.2f} millones devengados en los últimos 3 meses"),
    "meses_sin_devengado": ("financiera", "Meses desde el último devengado SIAF hasta T", "MEF SIAF",
                            "Falta de liquidez: causa de 24,2 % de las paralizaciones (Contraloría 2026)",
                            lambda v: f"{v:.0f} meses sin pagos registrados en el SIAF"),
    "problemas_mef_180d": ("financiera", "Problemas registrados en el seguimiento del MEF en (T−180, T]", "MEF estado situacional",
                           "La propia entidad reporta problemas", lambda v: f"{v:.0f} problemas reportados al MEF en 6 meses"),
    # ---------------- historial de actores ----------------
    "contratista_obras_previas": ("historial", "Obras del mismo RUC contratista iniciadas antes de T", "Cuadernos OECE",
                                  "Experiencia del contratista", lambda v: f"El contratista tiene {v:.0f} obras previas registradas"),
    "contratista_atrasos_previos": ("historial", "Obras del mismo contratista con atraso legal antes de T", "Cuadernos OECE",
                                    "Quien ya se atrasó tiende a repetir", lambda v: f"El contratista registró {v:.0f} atrasos previos"),
    "entidad_obras_previas": ("historial", "Obras de la misma entidad iniciadas antes de T", "Cuadernos OECE",
                              "Experiencia de gestión de la entidad", lambda v: f"La entidad tiene {v:.0f} obras previas registradas"),
    "entidad_atrasos_previos": ("historial", "Obras de la misma entidad con atraso legal antes de T", "Cuadernos OECE",
                                "Capacidad de la entidad para destrabar", lambda v: f"La entidad registró {v:.0f} obras con atraso previo"),
    # ---------------- calendario y clima ----------------
    "mes_sen": ("calendario", "sen(2π · mes(T) ÷ 12)", "Fecha de corte", "Estacionalidad del año", lambda v: "Época del año"),
    "mes_cos": ("calendario", "cos(2π · mes(T) ÷ 12)", "Fecha de corte", "Estacionalidad del año", lambda v: "Época del año"),
    "lluvias_en_horizonte": ("calendario", "1 si mes(T) ∈ {nov, dic, ene, feb}: el horizonte de 60 días cae en la temporada de lluvias (dic–mar)", "Fecha de corte",
                             "Temporada de lluvias en Arequipa (aproximación de clima)",
                             lambda v: "Los próximos 60 días caen en temporada de lluvias" if v >= 1 else "Los próximos 60 días están fuera de la temporada de lluvias"),
    "cierre_fiscal": ("calendario", "1 si mes(T) es octubre o noviembre", "Fecha de corte", "Presión de gasto antes del cierre del año fiscal",
                      lambda v: "Se acerca el cierre del año fiscal" if v >= 1 else "Lejos del cierre fiscal"),
}

CATEGORICAS = ["nivel_gobierno", "tipo_entidad", "sector"]


def por_grupo(grupos):
    return [k for k, v in CATALOGO.items() if v[0] in grupos]


def frase(nombre, valor):
    return CATALOGO[nombre][4](valor)
