// Construye informe/Informe_Caja_Negra_de_Obra.docx con la estructura del artículo GESITI.
// Todas las cifras se leen de resultados/*.json y web/data/resumen.json (generados por scripts/p0*.py).
// Uso: NODE_PATH=<carpeta con docx> node informe/fuente/construir.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, Header, Footer, PageNumber, LevelFormat, PageBreak, TableOfContents,
  ExternalHyperlink, TableLayoutType,
} = require("docx");

const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), "utf8"));
const P1 = leer("resultados/p01_resumen.json");
const EMP = leer("resultados/p02_emparejador.json");
const PLZ = leer("resultados/p03_plazos.json");
const MOD = leer("resultados/p04_modelo.json");
const WEB = leer("resultados/prototipo.json");
const RES = leer("web/data/resumen.json");
const MJ = leer("web/data/modelo.json");
const IND = leer("resultados/p03b_indicadores.json");
const PAT = leer("resultados/p03c_patrones.json");
const OBRA1 = leer(`web/data/obra/${leer("web/data/obras.json")[0].id}.json`);
const CG = { // Contraloría, Informe N.° 001-2026-CG/SESNC, corte 31-03-2026 (leído del PDF oficial)
  pais: 2241, costoPais: 73166, saldoTexto: 32196, saldoConclusion: 35196,
  aqp: 126, costoAqp: 8383127703, saldoAqp: 5605782805, pctCostoAqp: 11.5, pctObrasAqp: 5.6,
  serviciosAqp: 271, simultaneoAqp: 266, serviciosPais: 3858, simultaneoPais: 3672,
  conPim: 689, pctPim: 30.7, contrata: 1126, pctContrata: 50.2,
  causas: [["Incumplimiento de contrato", 619, 27.6], ["Falta de recursos financieros y liquidez", 542, 24.2],
    ["Deficiencia en el expediente técnico", 203, 9.1], ["Discrepancias, controversias y arbitraje", 203, 9.1],
    ["Abandono de obra", 169, 7.5], ["Incumplimiento del pago de valorizaciones u otros", 77, 3.4]],
};

// ---------- formato de números en español (coma decimal, espacio de miles) ----------
const n = (x, d = 0) => {
  const s = Number(x).toFixed(d);
  const [e, f] = s.split(".");
  const ent = e.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return f ? `${ent},${f}` : ent;
};
const pc = (x, d = 1) => `${n(100 * x, d)} %`;
const AQ = MOD.resultados.arequipa, NA = MOD.resultados.nacional;
const M = AQ.modelos["M Caja Negra"], MN = NA.modelos["M Caja Negra"];
const B0 = AQ.modelos["B0 Tasa base"], B1 = AQ.modelos["B1 Regla: consultas vencidas"], B2 = AQ.modelos["B2 Regresión logística"], B3 = AQ.modelos["B3 LightGBM solo cuaderno"];
const M1 = AQ.modelos["M1 LightGBM cuaderno + consultas"];
const GR = MJ.grupos, IG = MOD.importancia_grupo, AB = MOD.ablacion.por_grupo;
const NVAR = MJ.catalogo.length;
const ejemplosGrupo = {
  actividad: "asientos_30d, dias_sin_asientos, prop_supervisor_90d, ritmo_30_vs_90",
  senales: "ampliaciones (ampliaciones previas), suspensiones, penalidades, ordenes, alertas_90d",
  consultas: "consultas_vencidas, max_dias_espera, pct_respondidas_tarde, meses_seguidos_vencidas (persistencia)",
  plazo: "plazo_consumido, dias_restantes_plazo, avance_reportado, plazo_vs_avance",
  contrato: "log_monto_contratado, log_monto_viable, es_consorcio, nivel_gobierno, sector",
  financiera: "devengado_sobre_viable, devengado_3m, meses_sin_devengado, problemas_mef_180d",
  historial: "contratista_atrasos_previos, entidad_atrasos_previos, obras previas",
  calendario: "lluvias_en_horizonte, cierre_fiscal, mes_sen, mes_cos",
};
const porQueGrupo = {
  actividad: "Un cuaderno que cambia de ritmo o deja de escribirse anticipa que la obra cambia de situación.",
  senales: "Ampliaciones previas, suspensiones y penalidades muestran que el plazo ya se tensionó antes.",
  consultas: "Una consulta vencida habilita a pedir ampliación de plazo (RLGCP 190.4) y frena la partida.",
  plazo: "Si el tiempo corre más rápido que la obra (plazo consumido frente a avance físico), el atraso es aritmético.",
  contrato: "El tamaño, la modalidad y el tipo de entidad cambian la complejidad y la capacidad de gestión.",
  financiera: "Si no fluye el dinero la obra se frena: la falta de liquidez explica el 24,2 % de las paralizaciones.",
  historial: "Quien ya se atrasó tiende a repetir; la entidad que destraba rápido lo hace de nuevo.",
  calendario: "Lluvias de diciembre a marzo en Arequipa y presión de gasto antes del cierre fiscal.",
};
const fuenteGrupo = {
  actividad: "Cuaderno OECE", senales: "Cuaderno OECE", consultas: "Cuaderno OECE + emparejador + motor de plazos",
  plazo: "INFOBRAS (datos fijos del contrato) + texto de valorizaciones", contrato: "SEACE / CONOSCE; MEF Banco de Inversiones",
  financiera: "MEF SIAF y estado situacional", historial: "Cuadernos OECE (obras previas)", calendario: "Fecha de corte",
};
const E = EMP.evaluacion.prueba, EV = EMP.evaluacion.validacion;
const QA = PLZ.arequipa, QN = PLZ.nacional;
const NIV = Object.fromEntries(MOD.niveles.arequipa.map((x) => [x.nivel, x]));
const ANT = MOD.anticipacion.arequipa, ANTN = MOD.anticipacion.nacional;
const PAR = AQ.comparacion_pareada, PARN = NA.comparacion_pareada;
const asiPorObra = P1.arequipa.asientos / P1.arequipa.cuadernos;

// ---------- utilidades de documento ----------
const FUENTE = "Arial";
const TINTA = "1C2A39";
let nFig = 0, nTab = 0;
const r = (text, o = {}) => new TextRun({ text, font: FUENTE, ...o });
function runs(t) {
  // **negrita** dentro del texto
  return t.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => (s.startsWith("**") ? r(s.slice(2, -2), { bold: true }) : r(s)));
}
const p = (t, o = {}) => new Paragraph({ children: runs(t), spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED, ...o });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [r(t)], spacing: { before: 280, after: 140 } });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [r(t)], spacing: { before: 200, after: 100 } });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [r(t)], spacing: { before: 140, after: 80 } });
const vi = (t) => new Paragraph({ children: runs(t), numbering: { reference: "vinetas", level: 0 }, spacing: { after: 60, line: 290 } });
const nu = (t, ref = "numeros") => new Paragraph({ children: runs(t), numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 290 } });
const salto = () => new Paragraph({ children: [new PageBreak()] });
// Ecuación numerada: texto centrado en Cambria Math y número (n) alineado a la derecha.
let nEc = 0;
const ecuacion = (t) => {
  nEc += 1;
  return new Paragraph({
    tabStops: [{ type: "center", position: 4513 }, { type: "right", position: 9026 }], spacing: { before: 80, after: 120 }, keepLines: true,
    children: [new TextRun({ text: `\t${t}`, font: "Cambria Math", size: 22 }), new TextRun({ text: `\t(${nEc})`, font: FUENTE, size: 20 })],
  });
};

function figura(archivo, ancho, pie) {
  const ruta = path.join(RAIZ, "informe", "figuras", archivo);
  const buf = fs.readFileSync(ruta);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const anchoPx = ancho * 96 / 2.54; // ancho en cm
  nFig += 1;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: buf, transformation: { width: anchoPx, height: anchoPx * h / w } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [r(`Figura ${nFig}. `, { bold: true, size: 19 }), r(pie, { size: 19, italics: true })] }),
  ];
}

const ANCHO_TABLA = 9026; // A4 con márgenes de 2,5 cm (en DXA)
function tabla(titulo, cab, filas, proporciones, notaFuente) {
  nTab += 1;
  const total = proporciones.reduce((a, b) => a + b, 0);
  const anchos = proporciones.map((x) => Math.floor((x / total) * ANCHO_TABLA));
  anchos[anchos.length - 1] += ANCHO_TABLA - anchos.reduce((a, b) => a + b, 0);
  const borde = { style: BorderStyle.SINGLE, size: 4, color: "C9D1D9" };
  const celda = (t, i, esCab) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: esCab ? { type: ShadingType.CLEAR, fill: "1C2A39", color: "auto" } : undefined,
    borders: { top: borde, bottom: borde, left: borde, right: borde },
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: String(t).split("\n").map((linea) => new Paragraph({ spacing: { after: 0, line: 260 },
      children: esCab ? [r(linea, { bold: true, color: "FFFFFF", size: 18 })] : runs(linea).map((x) => { x.root?.[0]; return x; }) })),
  });
  const filasDoc = [new TableRow({ tableHeader: true, children: cab.map((c, i) => celda(c, i, true)) }),
    ...filas.map((f) => new TableRow({ children: f.map((c, i) => celda(c, i, false)) }))];
  const salida = [
    new Paragraph({ spacing: { before: 160, after: 60 }, keepNext: true, children: [r(`Tabla ${nTab}. `, { bold: true, size: 19 }), r(titulo, { size: 19, italics: true })] }),
    new Table({ width: { size: ANCHO_TABLA, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: anchos, rows: filasDoc }),
  ];
  if (notaFuente) salida.push(new Paragraph({ spacing: { before: 40, after: 200 }, children: [r(notaFuente, { size: 17, color: "4B5A6A" })] }));
  else salida.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  return salida;
}
const recuadro = (titulo, texto) => new Table({
  width: { size: ANCHO_TABLA, type: WidthType.DXA }, columnWidths: [ANCHO_TABLA],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: ANCHO_TABLA, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "EEF2FB", color: "auto" },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "2B4C9B" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "2B4C9B" },
      left: { style: BorderStyle.SINGLE, size: 24, color: "2B4C9B" }, right: { style: BorderStyle.SINGLE, size: 4, color: "2B4C9B" } },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    children: [new Paragraph({ spacing: { after: 60 }, children: [r(titulo, { bold: true, color: "2B4C9B" })] }),
      ...texto.map((t) => new Paragraph({ spacing: { after: 60, line: 280 }, children: runs(t) }))],
  })] })],
});
const espacio = () => new Paragraph({ spacing: { after: 120 }, children: [] });
const FIGS = [...fs.readFileSync(__filename, "utf8").matchAll(/\.\.\.figura\("([^"]+)"/g)].map((m) => m[1]);
const F = (a) => { const i = FIGS.indexOf(a); if (i < 0) throw new Error(`Figura no encontrada: ${a}`); return `Figura ${i + 1}`; };

// ---------- referencias (IEEE) ----------
const REF = [
  ["contraloria", "Contraloría General de la República, “Informe de obras paralizadas en el territorio nacional (corte al 31 de marzo de 2026),” Informe N.° 001-2026-CG/SESNC, Subgerencia de Seguimiento y Evaluación del Sistema Nacional de Control, Lima, Perú, may. 2026. [En línea]. Disponible: https://cdn.www.gob.pe/uploads/document/file/9989705/8147812-informe-de-obras-paralizadas-en-el-territorio-nacional-a-marzo-2026.PDF"],
  ["rlce", "Ministerio de Economía y Finanzas, “Decreto Supremo N.° 344-2018-EF, Reglamento de la Ley N.° 30225, Ley de Contrataciones del Estado (texto actualizado con el D. S. N.° 234-2022-EF), arts. 143, 193 y 203,” Diario Oficial El Peruano, Lima, 2018."],
  ["rlgcp", "Ministerio de Economía y Finanzas, “Decreto Supremo N.° 009-2025-EF, Reglamento de la Ley N.° 32069, Ley General de Contrataciones Públicas (modificado por el D. S. N.° 001-2026-EF), arts. 105 y 190,” Diario Oficial El Peruano, Lima, 2025."],
  ["ley32069", "Congreso de la República, “Ley N.° 32069, Ley General de Contrataciones Públicas,” Diario Oficial El Peruano, Lima, 2024."],
  ["oece", "Organismo Especializado para las Contrataciones Públicas Eficientes (OECE), “Datos abiertos del cuaderno de obra digital: asientos y cuadernos (junio 2024 – agosto 2026),” 2026. [En línea]. Disponible: https://osce-gob-pe.atlassian.net/wiki/rest/api/content/106889263"],
  ["directiva", "OECE, “Directiva que establece disposiciones para el uso del cuaderno de incidencias, Resolución N.° D000070-2025-OECE-PRE,” Lima, 2025. [En línea]. Disponible: https://lpderecho.pe/directiva-disposiciones-uso-cuaderno-incidencias-del-oece-resolucion-d000070-2025-oece-pre/"],
  ["pierri", "G. Pierri y M. Lafuente, “Gobierno digital y corrupción: el impacto de InfObras y el control ciudadano en la eficiencia de la ejecución de obras públicas en Perú,” Banco Interamericano de Desarrollo, Documento de discusión IDB-DP-832, nov. 2020."],
  ["velasquez", "A. Velásquez Jara, “El problema de las obras públicas paralizadas en Perú,” en Proc. 21st LACCEI Int. Multi-Conf. Eng., Educ. Technol., Buenos Aires, 2023. [En línea]. Disponible: https://laccei.org/LACCEI2023-BuenosAires/all-papers/Contribution_1193_a.pdf"],
  ["julca", "C. Julca-Varas, T. García-Segura, C. Torres-Machí y L. Montalbán-Domingo, “Primary risks for delays and cost overruns in the construction of drinking water supply and sanitation projects in Peru,” J. Manage. Eng., ASCE, 2025, doi: 10.1061/JMENEA.MEENG-6496."],
  ["ahp", "“Identification of delay causes in Peruvian construction projects: An expert AHP approach,” Rev. Ing. Constr., Pontificia Universidad Católica de Chile, 2025. [En línea]. Disponible: https://ojs.uc.cl/index.php/ric/article/view/86358"],
  ["carrasco", "L. M. Carrasco Crisanta, “Propuesta de un modelo matemático para el seguimiento técnico de obras públicas de saneamiento desde la perspectiva de una aseguradora en el Perú,” tesis de título, Pontificia Universidad Católica del Perú, Lima, 2025."],
  ["vilchez", "J. M. Vilchez Canchari, “Auditable early-warning of public-works stoppage and cost overruns in Peru: A graph-augmented machine learning framework with TreeSHAP and strict out-of-time validation,” manuscrito enviado a Rev. Constr., código: https://github.com/jvilchez-ucv/Public-Works-Stoppage-Peru, 2026."],
  ["cabezas", "J. H. Cabezas Mancilla y G. A. V. Mayhua Pimentel, “Delay risk prediction in public projects in Peru using machine learning and baseline development for BIM pilot projects evaluation,” SSRG Int. J. Civil Eng., oct. 2026 (registro en el CRIS de la Universidad Continental)."],
  ["funes", "Open Contracting Partnership, “Funes: the corruption-detecting algorithm that never forgets,” 10 sep. 2020. [En línea]. Disponible: https://www.open-contracting.org/2020/09/10/funes-the-corruption-detecting-algorithm-that-never-forgets/"],
  ["cardinal", "Open Contracting Partnership, “Cardinal: an open-source library to calculate public procurement red flags,” 12 jun. 2024. [En línea]. Disponible: https://www.open-contracting.org/2024/06/12/cardinal-an-open-source-library-to-calculate-public-procurement-red-flags/"],
  ["alice", "OKAI, “Órgãos federais economizaram em 2024 R$ 257 milhões de reais com apoio do robô Alice, da Controladoria-Geral da União,” 30 dic. 2024. [En línea]. Disponible: https://okai.com.br/noticia/2024-12-30/orgaos-federais-economizaram-em-2024-257-milhoes-de-reais-com-apoio-do-robo-alice-da-controladoria-geral-da-uniao"],
  ["tcu", "Tribunal de Contas da União, “Atualização do Painel de Obras Paralisadas,” Brasilia, 2025. [En línea]. Disponible: https://portal.tcu.gov.br/data/files/2C/06/48/45/FEC58910A0551289F18818A8/GABPRES-%20Atualizacao%20do%20Painel%20de%20Obras%201.pdf"],
  ["corea", "“Conversión de bitácoras de obra en datos estructurados con BERT para cuantificar el riesgo de retraso por lluvia en obras viales,” KoreaScience, 2023. [En línea]. Disponible: https://koreascience.kr/article/JAKO202312233376432.pdf"],
  ["cibw78", "“Large language models for inferring construction delay causes from weekly reports,” preprint, CIB W78 Conference, 2024. [En línea]. Disponible: https://easychair.org/publications/preprint/Lhpq"],
  ["sciendo", "“Situaciones adversas identificadas por monitores ciudadanos de control en obras públicas de La Libertad,” Rev. SCIENDO, Universidad Nacional de Trujillo. [En línea]. Disponible: https://revistas.unitru.edu.pe/index.php/SCIENDO/article/download/4929/5115/18554"],
  ["tdrcgr", "Contraloría General de la República, “Términos de referencia: modelo analítico predictivo de obras riesgosas (Programa BID SCC267),” Lima, 2022. [En línea]. Disponible: https://doc.contraloria.gob.pe/BID/2022/BID_SCC267/TDR.pdf"],
  ["sbert", "N. Reimers e I. Gurevych, “Sentence-BERT: Sentence embeddings using Siamese BERT-networks,” en Proc. EMNLP-IJCNLP, Hong Kong, 2019, pp. 3982–3992."],
  ["multiling", "N. Reimers e I. Gurevych, “Making monolingual sentence embeddings multilingual using knowledge distillation,” en Proc. EMNLP, 2020, pp. 4512–4525."],
  ["lightgbm", "G. Ke et al., “LightGBM: A highly efficient gradient boosting decision tree,” en Advances in Neural Information Processing Systems 30, 2017, pp. 3146–3154."],
  ["platt", "J. Platt, “Probabilistic outputs for support vector machines and comparisons to regularized likelihood methods,” en Advances in Large Margin Classifiers. Cambridge, MA, EE. UU.: MIT Press, 1999, pp. 61–74."],
  ["saito", "T. Saito y M. Rehmsmeier, “The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets,” PLoS ONE, vol. 10, no. 3, e0118432, 2015."],
  ["shap", "S. M. Lundberg y S.-I. Lee, “A unified approach to interpreting model predictions,” en Advances in Neural Information Processing Systems 30, 2017, pp. 4765–4774."],
  ["brier", "G. W. Brier, “Verification of forecasts expressed in terms of probability,” Monthly Weather Review, vol. 78, no. 1, pp. 1–3, 1950."],
  ["efron", "B. Efron y R. J. Tibshirani, An Introduction to the Bootstrap. Nueva York, EE. UU.: Chapman & Hall, 1993."],
  ["ley29733", "Congreso de la República, “Ley N.° 29733, Ley de Protección de Datos Personales,” Diario Oficial El Peruano, Lima, 2011."],
  ["ley27806", "Congreso de la República, “Ley N.° 27806, Ley de Transparencia y Acceso a la Información Pública,” Diario Oficial El Peruano, Lima, 2002."],
];
const IDX = Object.fromEntries(REF.map(([k], i) => [k, i + 1]));
const c = (...ks) => `[${ks.map((k) => IDX[k]).join("], [")}]`;

// ---------- contenido ----------
const C = [];
const add = (...x) => x.flat().forEach((e) => C.push(e));

// Portada / título
add(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [r("UNIVERSIDAD NACIONAL DE SAN AGUSTÍN DE AREQUIPA", { bold: true, size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [r("Facultad de Ingeniería de Producción y Servicios · Escuela Profesional de Ingeniería de Sistemas", { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [r("Gestión de Sistemas y Tecnologías de Información · X semestre", { size: 20, color: "4B5A6A" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [r("Inteligencia artificial sobre el cuaderno de obra digital para auditar consultas y anticipar atrasos en obras públicas de Arequipa", { bold: true, size: 34, color: TINTA })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [r("Caja Negra de Obra: un inspector virtual que lee lo que nadie alcanza a leer", { size: 24, italics: true, color: "2B4C9B" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [r("Ower Frank López", { bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [r("[Autores 2 a 5: completar nombres completos, correo institucional y ORCID]", { color: "9A6410" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [r("Universidad Nacional de San Agustín de Arequipa, Perú · olopeza@unsa.edu.pe", { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [r("Docente: Dr. R. Fabrizio Calienes Rodríguez · Arequipa, noviembre de 2026", { size: 20, color: "4B5A6A" })] }),
);

// Resumen
add(h1("Resumen"));
add(p(`Las obras públicas se atrasan y se paralizan: al 31 de marzo de 2026 la Contraloría registró ${n(CG.aqp)} obras paralizadas en Arequipa, con S/ ${n(CG.costoAqp / 1e6)} millones de costo actualizado y S/ ${n(CG.saldoAqp / 1e6)} millones por ejecutar ${c("contraloria")}. Las señales de que una obra se está trabando quedan escritas en el cuaderno de obra digital, pero nadie las lee a tiempo. Este estudio diseñó, construyó y evaluó «Caja Negra de Obra», un sistema que lee con inteligencia artificial los asientos publicados por el OECE. El sistema empareja cada consulta del residente con su respuesta, mide los días transcurridos frente al plazo legal (5 días, o 21 si interviene el proyectista) y estima, con ${NVAR} indicadores en 8 grupos (actividad del cuaderno, señales formales, consultas y plazos, plazo consumido frente a avance físico, contrato, ejecución financiera, historial de entidad y contratista, y calendario), la probabilidad de que la obra caiga en atraso legal en los 60 días siguientes. Se procesaron ${n(P1.nacional.asientos)} asientos (junio 2024 a agosto 2026) con evaluación en meses que el modelo no vio. El emparejador eligió la consulta correcta en ${pc(E.modelo_ia)} de los casos de Arequipa, frente a ${pc(E.regla_mas_reciente)} de la regla «la más reciente». De ${n(QA.consultas_residente)} consultas del residente en Arequipa, solo ${pc(QA.pct_respondidas_enlazadas / 100)} tiene una respuesta trazable en el cuaderno, y el ${n(QA.pct_tarde_entre_respondidas, 1)} % de las respuestas llegó fuera de plazo. En la prueba nacional el predictor alcanzó una PR-AUC de ${n(MN.pr_auc, 3)} (tasa base ${pc(NA.prevalencia)}), superior con significancia a la regla, a la regresión logística y al modelo solo con el cuaderno. En Arequipa, revisando el 20 % de obras-mes con mayor riesgo se encuentra ${pc(M.precision_top20)} de casos de atraso frente al ${pc(AQ.prevalencia)} al azar, y el sistema marcó con riesgo alto al ${n(ANT.pct_alertadas, 1)} % de las obras que luego se atrasaron, con una mediana de ${n(ANT.dias_anticipacion_mediana, 1)} días de anticipación. Cada alerta se explica con la contribución de cada indicador y con el asiento que la respalda, en un prototipo web público para ${n(RES.obras)} obras en ejecución.`));
add(p("**Palabras clave:** cuaderno de obra digital; obras públicas; procesamiento de lenguaje natural; alerta temprana; LightGBM; Arequipa."));
add(h2("Abstract"));
add(p(`Public works in Peru are frequently delayed or halted; by 31 March 2026 the Comptroller General recorded ${CG.aqp} halted works in Arequipa worth PEN ${(CG.costoAqp / 1e9).toFixed(2)} billion. Early signs are written in the digital site logbook but are read too late. We designed, built and evaluated “Caja Negra de Obra”, a system that reads the open logbook entries published by OECE with artificial intelligence to (i) link each contractor query to its answer, (ii) audit the answer time against the legal deadline (5 calendar days, or 21 when the designer is involved) and (iii) estimate, from ${NVAR} time-safe indicators in 8 groups, the probability of a legal delay within the next 60 days. We processed ${n(P1.nacional.asientos).replace(/ /g, ",")} entries (June 2024–August 2026) with strict out-of-time evaluation. The matcher identified the correct query in ${(100 * E.modelo_ia).toFixed(1)}% of Arequipa cases versus ${(100 * E.regla_mas_reciente).toFixed(1)}% for a recency rule. Only ${QA.pct_respondidas_enlazadas.toFixed(1)}% of residents' queries in Arequipa have a traceable answer and ${QA.pct_tarde_entre_respondidas.toFixed(1)}% of answers were late. On the national test set the predictor reached a PR-AUC of ${MN.pr_auc.toFixed(3)} (base rate ${(100 * NA.prevalencia).toFixed(1)}%), significantly above a rule, a logistic regression and a logbook-only model; in Arequipa it flagged ${ANT.pct_alertadas.toFixed(1)}% of later-delayed works a median of ${ANT.dias_anticipacion_mediana} days in advance. Every alert is explained with per-indicator TreeSHAP contributions and the written evidence in a public web prototype.`));
add(p("**Keywords:** digital site logbook; public works; natural language processing; early warning; LightGBM; Peru."));

// 1. Introducción
add(salto(), h1("1. Introducción"));
add(h2("1.1 Contexto del problema"));
add(p(`En el Perú, una obra pública se ejecuta bajo un contrato y se documenta día a día en el **cuaderno de obra**. Ahí el residente (representante del contratista) y el supervisor o inspector (representante de la entidad) anotan los avances, los problemas, las consultas y las órdenes. Desde junio de 2024 este cuaderno es digital y el OECE publica sus asientos como datos abiertos cada mes ${c("oece")}. Con la Ley N.° 32069 pasó a llamarse «cuaderno de incidencias», pero cumple la misma función ${c("ley32069", "directiva")}.`));
add(p(`El problema de fondo es conocido: las obras se atrasan y muchas terminan paralizadas. Según el informe oficial de la Contraloría, al 31 de marzo de 2026 había ${n(CG.pais)} obras paralizadas en el país, por S/ ${n(CG.costoPais)} millones, y ${n(CG.aqp)} en Arequipa, por S/ ${n(CG.costoAqp / 1e6)} millones: Arequipa es el tercer departamento por costo de obras paralizadas (${n(CG.pctCostoAqp, 1)} % del país), después de Lima y La Libertad ${c("contraloria")}. Las causas que declaran las entidades son el incumplimiento de contrato (27,6 %), la falta de recursos financieros y liquidez (24,2 %), las deficiencias del expediente técnico (9,1 %) y las discrepancias, controversias y arbitraje (9,1 %) ${c("contraloria")}. Varias de esas causas dejan rastro antes en el cuaderno de obra (consultas por vacíos del expediente, órdenes, penalidades, suspensiones) y en la ejecución financiera, que es justamente lo que este sistema lee.`));
add(p(`Este estudio no busca resolver todas esas causas. Se concentra en una pieza concreta y medible: las **consultas** que el residente formula cuando el expediente técnico no resuelve algo, y el tiempo que toma responderlas. La ley fija plazos: el supervisor debe absolverlas en 5 días calendario, y si necesita la opinión del proyectista, la cadena completa suma 21 días ${c("rlce", "rlgcp")}. Si no se responde a tiempo, el contratista puede pedir una ampliación de plazo, y la obra se alarga ${c("rlgcp")}.`));
add(h2("1.2 Problema de investigación"));
add(recuadro("El problema en una frase", [
  "Las señales de que una obra se está trabando quedan escritas en el cuaderno de obra, pero se leen tarde: cuando el atraso ya ocurrió.",
  `En Arequipa hay ${n(P1.arequipa.cuadernos)} cuadernos con ${n(P1.arequipa.asientos)} asientos (unos ${n(asiPorObra)} por obra). Ninguna entidad puede leerlos todos cada mes, y los datos abiertos no indican qué respuesta corresponde a qué consulta. Por eso nadie sabe cuánto tardan las respuestas ni qué obras van camino al atraso.`,
]));
add(espacio());
add(p("**Quiénes se ven afectados.** La entidad contratante, que paga ampliaciones y mayores costos; el supervisor, que responde por el control de la obra; el Órgano de Control Institucional, que llega cuando el daño está hecho; y la población, que espera la obra."));
add(p(`**Consecuencias.** El atraso se detecta recién cuando la valorización mensual muestra un avance menor al 80 % de lo programado. Esto obliga a un calendario acelerado ${c("rlce")} y, en los peores casos, termina en paralización.`));
add(...figura("d01_arbol_problema.png", 16, "Árbol de problemas: causas, problema central y efectos."));
add(h2("1.3 Evidencia del problema"));
add(...tabla("Evidencia que sustenta el problema", ["Evidencia", "Dato", "Fuente"], [
  ["Obras paralizadas en Arequipa (31-03-2026)", `${n(CG.aqp)} obras (${n(CG.pctObrasAqp, 1)} % del país); S/ ${n(CG.costoAqp)} de costo actualizado (${n(CG.pctCostoAqp, 1)} %, tercer departamento) y S/ ${n(CG.saldoAqp)} por ejecutar`, `Contraloría, Tabla 3 ${c("contraloria")}`],
  ["Obras paralizadas en el país (31-03-2026)", `${n(CG.pais)} obras; S/ ${n(CG.costoPais)} millones de inversión; ${n(CG.pctContrata, 1)} % por contrata`, `Contraloría ${c("contraloria")}`],
  ["Causas declaradas de paralización", CG.causas.slice(0, 4).map(([k, , q]) => `${k}: ${n(q, 1)} %`).join("; "), `Contraloría, Tabla 9 ${c("contraloria")}`],
  ["Respuesta del control", `${n(CG.serviciosAqp)} servicios de control en Arequipa (${n(CG.simultaneoAqp)} de control simultáneo); ${n(CG.serviciosPais)} en el país`, `Contraloría, Tabla 20 ${c("contraloria")}`],
  ["Financiamiento para reactivar", `Solo ${n(CG.conPim)} de ${n(CG.pais)} obras paralizadas (${n(CG.pctPim, 1)} %) tienen presupuesto (PIM) en 2026`, `Contraloría, Tabla 16 ${c("contraloria")}`],
  ["Asientos del cuaderno de obra en Arequipa", `${n(P1.arequipa.asientos)} asientos en ${n(P1.arequipa.cuadernos)} cuadernos (jun-2024 a ago-2026)`, `Cálculo propio sobre datos OECE ${c("oece")}`],
  ["Consultas del residente en Arequipa", `${n(QA.consultas_residente)} consultas; solo ${n(QA.pct_respondidas_enlazadas, 1)} % con respuesta trazable en el cuaderno`, "Cálculo propio (este estudio)"],
  ["Respuestas fuera del plazo legal", `${n(QA.pct_tarde_entre_respondidas, 1)} % en Arequipa y ${n(QN.pct_tarde_entre_respondidas, 1)} % en el país`, "Cálculo propio (este estudio)"],
  ["Obras de Arequipa que cayeron en atraso legal", `${n(P1.arequipa.cuadernos_con_evento)} de ${n(P1.arequipa.cuadernos)} cuadernos`, "Cálculo propio sobre datos OECE"],
  ["Control ciudadano y ejecución", "InfObras y los monitores redujeron sobrecostos, pero no mejoraron la ejecución", c("pierri")],
], [3, 4.4, 2], `Cifras de la Contraloría tomadas directamente del PDF oficial (Informe N.° 001-2026-CG/SESNC, mayo de 2026). El propio informe reporta dos saldos nacionales por ejecutar: S/ ${n(CG.saldoTexto)} millones en el texto de la sección 2.2 y S/ ${n(CG.saldoConclusion)} millones en sus conclusiones; por eso aquí solo se usa el costo total nacional y el saldo de Arequipa, que coincide en todas sus tablas.`));
add(h2("1.4 Estado actual del conocimiento"));
add(p(`Existen plataformas de seguimiento (INFOBRAS, el Sistema de Seguimiento de Inversiones del MEF) que muestran el estado de cada obra, pero son fotos del momento y no anticipan. Hay estudios que explican las causas de los atrasos con encuestas, paneles de expertos o revisión manual de documentos ${c("velasquez", "julca", "ahp")}. También hay modelos de aprendizaje automático que predicen atrasos o paralizaciones con datos estructurados de proyectos ${c("vilchez", "cabezas")}, y herramientas de analítica de riesgo en la contratación pública ${c("funes", "cardinal", "alice")}. En otros países se empieza a leer con inteligencia artificial las bitácoras y reportes de obra ${c("corea", "cibw78")}.`));
add(h2("1.5 Brecha de investigación"));
add(p("No encontramos ningún trabajo que lea el cuaderno de obra digital peruano con inteligencia artificial, ni que mida si las consultas se responden dentro del plazo legal. Las herramientas existentes usan datos estructurados (montos, plazos, avance declarado) y dejan sin usar el texto que se escribe durante la ejecución. Además, el campo oficial que debería unir cada respuesta con su consulta (ASIENTO_ENLAZADO) apunta a un identificador anonimizado que no se publica, por lo que el dato «días hasta la respuesta» simplemente no existe en ninguna fuente pública."));
add(h2("1.6 Justificación"));
add(vi("**Organizacional:** da a la supervisión, a la entidad y al Órgano de Control Institucional una lista mensual de obras para revisar primero, con la razón y la prueba escrita."));
add(vi("**Tecnológica:** muestra que datos abiertos ya publicados, procesados con técnicas de IA ligeras y de costo cero, bastan para producir información nueva."));
add(vi("**Científica:** aporta una medición inédita del cumplimiento de plazos de absolución y una evaluación honesta (fuera de tiempo, con comparadores) de su valor para anticipar atrasos."));
add(vi("**Social:** una obra que se destraba a tiempo llega antes a la población y cuesta menos."));
add(h2("1.7 Objetivo general"));
add(p("Desarrollar y evaluar un sistema de información con inteligencia artificial que lea el cuaderno de obra digital de las obras públicas de Arequipa para medir el cumplimiento de los plazos legales de respuesta a consultas y anticipar con 60 días el atraso legal, con exactitud superior a la de los criterios de revisión disponibles."));
add(h2("1.8 Objetivos específicos"));
add(nu("**OE1.** Integrar y depurar los asientos del cuaderno de obra digital publicados por el OECE, con trazabilidad completa de la fuente."));
add(nu("**OE2.** Construir un emparejador consulta–respuesta con IA y medir su exactitud frente a reglas simples."));
add(nu("**OE3.** Implementar un motor de plazos legales que clasifique cada consulta (a tiempo, tarde, en plazo, sin respuesta en el cuaderno) e identifique al responsable."));
add(nu("**OE4.** Construir un catálogo de indicadores con corte temporal (actividad, señales, consultas, plazo y avance, contrato, ejecución financiera, historial y calendario) y entrenar y evaluar, con validación temporal, un predictor explicable de atraso legal a 60 días, comparándolo con el azar, una regla y modelos más simples."));
add(nu("**OE5.** Implementar y desplegar un prototipo web simple que muestre el riesgo, el responsable y la prueba escrita de cada obra."));
add(h2("1.9 Pregunta de investigación e hipótesis"));
add(p("**Pregunta.** ¿En qué medida un sistema que lee con IA el cuaderno de obra digital permite medir el cumplimiento de los plazos de respuesta a consultas y anticipar el atraso legal de las obras públicas de Arequipa, mejor que los criterios de revisión disponibles?"));
add(vi("**H1.** El emparejador con IA identifica la consulta que se responde con mayor exactitud que la regla «la consulta más reciente»."));
add(vi("**H2.** El predictor ordena las obras por riesgo mejor que una revisión al azar y que una regla simple (PR-AUC mayor)."));
add(vi("**H3.** Agregar a la actividad del cuaderno los indicadores de consultas y plazos, plazo y avance, contrato, ejecución financiera, historial y calendario mejora la predicción frente al modelo que solo usa el cuaderno."));
add(h2("1.10 Contribución del estudio"));
add(vi("**Empírica:** la primera medición, para Arequipa y el país, de cuánto tardan las respuestas a consultas en obras públicas y de cuántas no quedan registradas en el cuaderno."));
add(vi("**Metodológica:** un método para enlazar consultas y respuestas que se entrena sin etiquetado manual, usando las respuestas que sí citan el número de asiento."));
add(vi("**Aplicada:** un prototipo desplegado, de costo cero, que convierte datos abiertos en una lista de revisión con prueba escrita."));

// 2. Estado del arte
add(salto(), h1("2. Estado del arte"));
add(h2("2.1 Estrategia de búsqueda"));
add(p("Se buscó en Google Scholar, arXiv, los repositorios peruanos ALICIA (CONCYTEC), RENATI, UNSA y PUCP, las actas de LACCEI y CIB W78, y los sitios de la Contraloría, el OECE, el MEF, el Banco Interamericano de Desarrollo, el Tribunal de Cuentas de Brasil y Open Contracting Partnership. Periodo: 2018 a 2026. Términos (en español, inglés y portugués): «obras paralizadas», «atraso de obra», «cuaderno de obra», «bitácora de obra», «construction delay prediction», «site diary NLP», «public works early warning», «obras paralisadas»."));
add(p("**Inclusión:** trabajos sobre atraso o paralización de obras públicas, analítica o IA aplicada al control de obras o contrataciones, y procesamiento de texto de documentos de obra. **Exclusión:** obra privada sin relación con el control público, y trabajos sin acceso al documento o sin datos verificables. Se marcaron como «parcialmente verificados» los trabajos cuyo título existe pero cuyo contenido no pudo leerse."));
add(h2("2.2 Investigaciones relacionadas"));
add(p(`**Seguimiento y control social.** INFOBRAS y el control ciudadano fueron evaluados por el BID con un diseño de regresión discontinua: redujeron sobrecostos en obras por contrata, pero no mejoraron los resultados de ejecución ${c("pierri")}. En las visitas de monitores ciudadanos, las situaciones adversas más frecuentes fueron la ausencia del supervisor y la falta del cuaderno de obra ${c("sciendo")}. Es decir: mirar la obra no basta si no se mira lo que pasa en su ejecución diaria.`));
add(p(`**Causas del atraso.** Velásquez Jara analizó cualitativamente 1 879 obras paralizadas a diciembre de 2022 ${c("velasquez")}. Un estudio con AHP y expertos ubicó como causas principales las deficiencias de la documentación técnica y la mala planificación ${c("ahp")}. Julca-Varas y colaboradores revisaron a mano las órdenes de cambio de 318 proyectos de agua y saneamiento ${c("julca")}. Carrasco propuso un puntaje para obras de saneamiento donde los «comentarios del supervisor» se califican manualmente ${c("carrasco")}. Todos coinciden en que la información de la ejecución explica el atraso, pero ninguno la procesa en forma automática.`));
add(p(`**Predicción con aprendizaje automático.** Hay modelos que estiman el riesgo de paralización o de atraso a partir de datos estructurados de INFOBRAS, el MEF y el SEACE ${c("vilchez")}, y un artículo de 2026 sobre predicción de atrasos en proyectos públicos peruanos cuyo contenido no pudimos revisar ${c("cabezas")}. La Contraloría planificó en 2022 un modelo predictivo de obras riesgosas, sin resultados públicos ${c("tdrcgr")}. Estos trabajos usan lo que la obra declara en sistemas administrativos, no lo que se escribe en el cuaderno.`));
add(p(`**Analítica de contratación.** Funes (Ojo Público) puntúa el riesgo de corrupción en contratos ${c("funes")}; Cardinal automatiza banderas rojas ${c("cardinal")}; Alice, en Brasil, analiza editales con minería de textos ${c("alice")}; y el Tribunal de Cuentas brasileño mantiene un panel de obras paralizadas ${c("tcu")}. Todos operan en la etapa de contratación o de reporte, no en la ejecución diaria.`));
add(p(`**Texto de obra con IA.** En Corea se usó BERT para estructurar bitácoras de obras viales ${c("corea")}, y en CIB W78 se usaron modelos de lenguaje para inferir causas de atraso en reportes semanales ${c("cibw78")}. Son la referencia técnica más cercana, pero en otros idiomas, con otros documentos y sin vínculo con plazos legales.`));
add(h2("2.3 Comparación crítica"));
add(...tabla("Comparación de los trabajos relacionados", ["Trabajo", "Problema", "Datos y método", "Resultado", "Limitación frente a este estudio"], [
  [`Pierri y Lafuente ${c("pierri")}`, "Efecto de InfObras y monitores", "INFOBRAS y MEF; regresión discontinua", "Menos sobrecostos; sin efecto en ejecución", "Evalúa, no anticipa"],
  [`Velásquez Jara ${c("velasquez")}`, "Obras paralizadas", "Análisis cualitativo", "Causas principales", "Sin datos de ejecución ni modelo"],
  [`Julca-Varas et al. ${c("julca")}`, "Riesgos de atraso en saneamiento", "Revisión manual de órdenes de cambio (318)", "Riesgos primarios", "Manual, no escalable"],
  [`Carrasco ${c("carrasco")}`, "Seguimiento de obras de saneamiento", "Puntaje ponderado; comentarios calificados a mano", "Alerta 4 meses antes en su muestra", "Lectura manual del texto"],
  [`Vilchez ${c("vilchez")}`, "Paralización y sobrecosto", "LightGBM y grafo sobre INFOBRAS, SSI y SEACE", "Riesgo por obra", "No usa el cuaderno de obra"],
  [`Funes, Cardinal, Alice ${c("funes", "cardinal", "alice")}`, "Riesgo en contrataciones", "Indicadores y minería de textos", "Alertas de contratación", "Etapa previa a la ejecución"],
  [`Corea, CIB W78 ${c("corea", "cibw78")}`, "Texto de bitácoras y reportes", "BERT y modelos de lenguaje", "Datos estructurados de texto", "Otro idioma y sin plazos legales"],
  ["Este estudio", "Consultas trabadas y atraso legal", "Cuaderno de obra digital; IA para enlazar; LightGBM", "Ver sección 5", "Solo obras con cuaderno digital"],
], [2.2, 2, 2.6, 2, 2.4]));
add(h2("2.4 Brecha identificada"));
add(p("La brecha está en el **texto de la ejecución**. El cuaderno de obra es la única fuente oficial, fechada, diaria y obligatoria que registra lo que pasa en la obra, y es abierta desde 2024. Sin embargo, nadie la lee de forma sistemática, y los datos abiertos no permiten saber qué respuesta corresponde a qué consulta. Este estudio cubre esa brecha con un sistema que reconstruye ese enlace, lo compara con la ley y lo usa para anticipar el atraso."));

// 3. Metodología
add(salto(), h1("3. Metodología"));
add(h2("3.1 Enfoque y tipo de investigación"));
add(p("Enfoque **cuantitativo** e investigación **aplicada**: se construye un artefacto tecnológico y se mide su desempeño con datos reales. Se eligió este enfoque porque las preguntas tienen respuesta numérica (exactitud, días, probabilidad) y los datos oficiales permiten medirla sin encuestas."));
add(h2("3.2 Diseño de investigación"));
add(p(`Investigación basada en diseño (design science), con evaluación **retrospectiva fuera de tiempo**: el sistema se entrena con meses pasados y se prueba en meses posteriores que nunca vio. Esto simula su uso real, donde solo se conoce el pasado. Las fases se muestran en la ${F("d11_metodologia.png")}.`));
add(...figura("d11_metodologia.png", 6.5, "Fases del procedimiento de investigación."));
add(h2("3.3 Contexto de estudio"));
add(p(`Obras públicas ejecutadas por contrata en el departamento de Arequipa (8 provincias) que usan el cuaderno de obra digital, entre junio de 2024 y agosto de 2026. Los usuarios previstos son los supervisores e inspectores, las áreas de obras de las entidades (gobierno regional, municipalidades) y los Órganos de Control Institucional. Como en Arequipa hay pocos casos de atraso para entrenar un modelo, el aprendizaje se hace con todo el país y la evaluación principal se reporta para Arequipa.`));
add(h2("3.4 Población y muestra"));
add(...tabla("Población y unidades de análisis", ["Unidad", "Arequipa", "Perú", "Uso"], [
  ["Cuadernos de obra con asientos", n(P1.arequipa.cuadernos), n(P1.nacional.cuadernos), "Población completa (no se muestrea)"],
  ["Asientos (anotaciones)", n(P1.arequipa.asientos), n(P1.nacional.asientos), "Lectura del sistema"],
  ["Consultas (todas / del residente)", `${n(P1.arequipa.consultas)} / ${n(P1.arequipa.consultas_residente)}`, `${n(P1.nacional.consultas)} / ${n(P1.nacional.consultas_residente)}`, "Auditoría de plazos"],
  ["Respuestas a consultas", n(P1.arequipa.respuestas), n(P1.nacional.respuestas), "Emparejador"],
  ["Respuestas con cita verificable (conjunto de oro)", n(EMP.conjunto_oro.prueba), n(EMP.conjunto_oro.entrenamiento + EMP.conjunto_oro.validacion + EMP.conjunto_oro.prueba), "Entrenar y probar el emparejador"],
  ["Obra-mes observables (panel)", n(PLZ.panel.arequipa.filas_observables), n(PLZ.panel.filas_observables), "Entrenar y probar el predictor"],
  ["Obra-mes con atraso en 60 días", n(PLZ.panel.arequipa.positivos), n(PLZ.panel.positivos), "Casos positivos"],
], [3.2, 1.6, 1.6, 2.6], "Se trabaja con la población completa publicada. Solo entran al panel los cuadernos con historia completa (se observa su asiento N.° 1)."));
add(h2("3.5 Variables y dimensiones"));
add(...tabla("Variables del estudio", ["Variable", "Tipo", "Definición simple", "Cómo se mide"], [
  ["Atraso legal en 60 días", "Dependiente (predictor)", "Aparece en el cuaderno el primer asiento de «valorización menor al 80 %» o «calendario acelerado»", "1 si ocurre entre el corte T y T + 60 días; 0 si no"],
  ["Consulta correcta", "Dependiente (emparejador)", "La respuesta se enlaza con la consulta que de verdad contesta", "Coincide con la consulta citada (con el número borrado)"],
  ...Object.entries(GR).map(([g, nombre]) => [nombre, "Independiente", porQueGrupo[g],
    `${MJ.catalogo.filter((x) => x.grupo === nombre).length} indicadores (ver Anexo D)`]),
], [2.2, 1.6, 3.6, 2.2], "Las variables independientes se calculan para cada obra al cierre de cada mes T, usando solo información con fecha menor o igual a T."));
add(h2("3.6 Indicadores"));
add(p(`Se eligieron indicadores que respondan preguntas concretas de quien revisa obras. La regla principal: **no se usa la exactitud** (porcentaje de aciertos totales) para el predictor, porque el atraso es poco frecuente (${pc(AQ.prevalencia)} de las obras-mes de Arequipa en la prueba). Un sistema que dijera siempre «no se atrasa» acertaría el ${pc(1 - AQ.prevalencia)} y no serviría para nada ${c("saito")}.`));
add(...tabla("Indicadores, fórmula y razón de su elección", ["Indicador", "Qué pregunta responde", "Cómo se calcula", "Por qué se usa"], [
  ["Exactitud top-1 del emparejador", "¿Elige la consulta correcta?", "Respuestas bien enlazadas ÷ respuestas evaluadas", "Es la tarea directa del componente"],
  ["Precisión y cobertura con umbral", "¿Cuánto acierta cuando decide enlazar, y cuántas enlaza?", "Aciertos ÷ enlaces aceptados; enlaces aceptados ÷ total", "Evita enlaces dudosos en la auditoría"],
  ["PR-AUC (principal)", "¿Qué tan bien ordena las obras cuando el atraso es raro?", "Área bajo la curva precisión–exhaustividad", "Es la recomendada para eventos poco frecuentes " + c("saito")],
  ["ROC-AUC", "¿Distingue una obra que se atrasa de una que no?", "Probabilidad de ordenar bien un par al azar", "Comparabilidad con otros estudios"],
  ["Precisión en el 20 % superior", "Si reviso 1 de cada 5 obras, ¿cuántas tenían el problema?", "Atrasos en el 20 % de mayor riesgo ÷ obras revisadas", "Representa la capacidad real de revisión"],
  ["Exhaustividad en el 20 % superior", "¿Qué parte de los atrasos encuentro revisando ese 20 %?", "Atrasos encontrados ÷ atrasos totales", "Mide cuánto problema se cubre"],
  ["Puntaje de Brier y calibración", "Si dice 10 %, ¿pasa en verdad un 10 %?", "Error cuadrático medio de la probabilidad " + c("brier"), "Para que la probabilidad se pueda creer"],
  ["Anticipación", "¿Con cuántos días de ventaja avisa?", "Días entre la primera alerta alta y el atraso", "Es el propósito de una alerta temprana"],
  ["Tiempos de carga y errores", "¿El prototipo responde rápido y sin fallas?", "Mediana de 5 cargas; errores de consola", "Rendimiento y calidad del software"],
], [2.2, 2.6, 2.6, 2.4], "Se descartaron la exactitud y el F1 global del predictor: dependen de un umbral arbitrario y la exactitud se infla con eventos raros. La precisión y exhaustividad se reportan en el umbral operativo (20 % superior)."));
add(h2("3.7 Indicadores predictores: qué se mide de cada obra y por qué"));
add(p(`El predictor no mira solo el cuaderno. Cada mes T arma, para cada obra, un vector de ${NVAR} indicadores en ocho grupos. Tres grupos salen del cuaderno de obra (lo que se escribe), y cinco salen de fuentes oficiales externas: INFOBRAS (plazo y fechas originales del contrato), SEACE/CONOSCE (monto contratado), el Banco de Inversiones y el SIAF del MEF (monto viable, dinero devengado, problemas reportados) y la propia historia de cuadernos de cada entidad y contratista. La regla de oro es el **corte temporal**: un indicador del mes T solo puede usar datos con fecha menor o igual a T; de INFOBRAS solo se usan datos fijos del contrato, nunca el avance de la foto actual. La ${F("d12_indicadores.png")} resume los grupos y la Tabla siguiente explica por qué cada uno ayuda a anticipar un evento de plazo.`));
add(...figura("d12_indicadores.png", 14.5, "Los ocho grupos de indicadores que forman cada fila obra-mes."));
add(...tabla("Grupos de indicadores: qué capturan, de dónde salen y cuánto aportan", ["Grupo", "N.º", "Indicadores principales", "Fuente", "Por qué explica un evento de plazo", "Importancia", "Caída PR-AUC sin el grupo (validación)"],
  Object.entries(GR).map(([g, nombre]) => [nombre, String(MJ.catalogo.filter((x) => x.grupo === nombre).length), ejemplosGrupo[g],
    fuenteGrupo[g], porQueGrupo[g], `${n(IG[g], 1)} %`, `${AB[g].validacion.caida > 0 ? "+" : ""}${n(AB[g].validacion.caida, 4)}`]),
  [1.4, 0.4, 2.3, 1.5, 2.6, 0.9, 1.1], "Importancia: porcentaje de la ganancia (gain) de los árboles del modelo final. Caída: PR-AUC de validación del modelo completo menos la del modelo reentrenado sin el grupo. El catálogo completo, con la fórmula de cada indicador y su cobertura, está en el Anexo D."));
add(h3("Patrones observados en los datos"));
add(p(`Antes de modelar, se miró cómo se comporta cada indicador en las obras-mes que luego cayeron en atraso. Se usaron solo los cortes de entrenamiento y validación (${n(PAT.filas)} obras-mes de ${n(PAT.obras)} obras, con ${n(PAT.positivos)} atrasos; tasa base ${pc(PAT.tasa_base)}); la prueba no se miró. Para cada indicador se compara la tasa de atraso cuando el valor es bajo (hasta el percentil 25) y cuando es alto (sobre el percentil 75); en indicadores donde la mayoría vale cero, se compara cero frente a mayor que cero.`));
const nombreInd = (v) => MJ.catalogo.find((x) => x.variable === v).formula;
add(...tabla("Patrones: tasa de atraso a 60 días según el valor del indicador (entrenamiento y validación, todo el país)", ["Indicador", "Grupo", "Valores comparados", "Tasa si es bajo", "Tasa si es alto", "Veces", "Lectura"],
  PAT.patrones.map((x) => [x.variable, x.grupo, `${x.comparacion.replace(/\./g, ",")}${x.unidad ? ` (${x.unidad})` : ""}`, pc(x.tasa_bajo), pc(x.tasa_alto), `${n(x.razon_alto_bajo, 2)}×`,
    x.razon_alto_bajo >= 1.25 ? "Más riesgo cuando sube" : x.razon_alto_bajo <= 0.8 ? "Menos riesgo cuando sube" : "Efecto débil por sí solo"]),
  [2.3, 1.6, 1.8, 0.9, 0.9, 0.8, 1.6], "«Veces» = tasa si es alto ÷ tasa si es bajo. Son asociaciones, no causas: el modelo combina todos los indicadores y puede usar un indicador débil por sí solo en interacción con otros."));
add(p(`Tres patrones ayudan a entender el problema. Primero, **la actividad importa en los dos sentidos**: las obras con más anotaciones en el último mes se atrasan más (${n(PAT.patrones.find((x) => x.variable === "asientos_30d").razon_alto_bajo, 1)} veces), porque hay obra en marcha que puede atrasarse, mientras que un cuaderno detenido por muchos días suele ser una obra ya suspendida. Segundo, **las señales formales y las consultas vencidas anticipan**: con penalidades anotadas la tasa sube ${n(PAT.patrones.find((x) => x.variable === "penalidades").razon_alto_bajo, 1)} veces y con consultas vencidas ${n(PAT.patrones.find((x) => x.variable === "consultas_vencidas").razon_alto_bajo, 1)} veces. Tercero, **el atraso legal aparece pronto**: el evento se mide la primera vez que ocurre, y por eso es más frecuente cuando todavía quedan muchos días de plazo (${n(PAT.patrones.find((x) => x.variable === "dias_restantes_plazo").razon_alto_bajo, 1)} veces) que cuando el plazo ya se consumió.`));

add(h2("3.8 Formulación del modelo de predicción"));
add(p("Esta sección muestra, paso a paso, cómo el sistema pasa de los asientos a una probabilidad. Cada fórmula se explica en palabras debajo."));
add(h3("Qué se predice"));
add(ecuacion("y(i, T) = 1 si ∃ asiento de atraso legal con fecha en (T, T + 60];   0 si no"));
add(p("Para la obra i y el fin de mes T, la etiqueta vale 1 si en los 60 días siguientes la propia obra anota un asiento de «valorización menor al 80 % de lo programado» o de «calendario acelerado», los dos supuestos de atraso que la norma obliga a registrar (RLCE art. 203; Ley 32069 y su reglamento). Se cuenta el primer evento de cada obra."));
add(ecuacion("x(i, T) = (x₁, x₂, …, x₅₃),   con xⱼ = gⱼ(datos con fecha ≤ T)"));
add(p("El vector de indicadores de la obra en ese mes (sección 3.7). Si una fuente no tiene el dato, el valor queda vacío y el árbol aprende una rama propia para «sin dato»."));
add(h3("Cómo calcula el puntaje"));
add(ecuacion(`F(x) = Σₖ fₖ(x),   k = 1, …, ${MOD.arboles.final}`));
add(p(`El modelo LightGBM ${c("lightgbm")} es una suma de ${MOD.arboles.final} árboles de decisión pequeños. Cada árbol fₖ hace preguntas del tipo «¿tiene más de 2 consultas vencidas?» y devuelve un número; la suma F(x) es el puntaje de riesgo en escala logit.`));
add(ecuacion("L = − Σᵢ [ yᵢ ln pᵢ + (1 − yᵢ) ln(1 − pᵢ) ] + λ Σ w²,   pᵢ = σ(F(xᵢ)) = 1 / (1 + e^−F(xᵢ))"));
add(p("Los árboles se construyen uno tras otro: cada nuevo árbol corrige el error (log-loss) que dejan los anteriores en las obras-mes de entrenamiento. El término λΣw² (L2) evita que un árbol pese demasiado. La cantidad de árboles la decide la parada temprana: se deja de agregar árboles cuando la PR-AUC de validación deja de mejorar durante 200 rondas."));
add(...tabla("Configuración del modelo final", ["Parámetro", "Valor", "Qué controla"], [
  ["Árboles (K)", n(MOD.arboles.final), "Fijado por parada temprana en validación"],
  ["Tasa de aprendizaje", n(MJ.hiperparametros.learning_rate, 2), "Cuánto corrige cada árbol; baja = más estable"],
  ["Hojas por árbol", n(MJ.hiperparametros.num_leaves), "Complejidad de cada árbol"],
  ["Mínimo de obras-mes por hoja", n(MJ.hiperparametros.min_data_in_leaf), "Evita reglas basadas en pocos casos"],
  ["Regularización L2 (λ)", n(MJ.hiperparametros.lambda_l2), "Penaliza valores extremos en las hojas"],
  ["Submuestreo de filas / columnas", `${pc(MJ.hiperparametros.bagging_fraction, 0)} / ${pc(MJ.hiperparametros.feature_fraction, 0)}`, "Cada árbol ve una parte distinta de datos e indicadores"],
  ["Semilla", "20261101", "Reproducibilidad"],
], [3, 1.6, 4.4]));
add(h3("Cómo explica cada alerta"));
add(ecuacion("F(x) = φ₀ + Σⱼ φⱼ(x),   j = 1, …, 53"));
add(p(`TreeSHAP ${c("shap")} reparte el puntaje exacto entre los indicadores: φ₀ = ${n(MJ.base_logit, 3)} es la base común y cada φⱼ dice cuánto subió (φⱼ > 0) o bajó (φⱼ < 0) el riesgo por el valor de ese indicador en esa obra. La ficha web muestra las ocho φⱼ de mayor tamaño, traducidas a frases simples.`));
add(h3("Cómo convierte el puntaje en probabilidad y nivel"));
add(ecuacion(`p = 1 / (1 + e^−(A·F(x) + B)),   A = ${n(MJ.platt.A, 3)},  B = ${n(MJ.platt.B, 3)}`));
add(p(`La calibración de Platt ${c("platt")} ajusta A y B en validación para que la probabilidad signifique lo que dice: de cada 100 obras con p = 10 %, unas 10 se atrasan. No cambia el orden de las obras.`));
add(ecuacion(`nivel = ALTO si p ≥ ${n(100 * MOD.niveles.umbral_alto, 2)} %;  MEDIO si p ≥ ${n(100 * MOD.niveles.umbral_medio, 2)} %;  si no, BAJO`));
add(p("Los umbrales son los percentiles 80 y 50 de la probabilidad en validación: el nivel alto es el 20 % superior y el medio el 30 % siguiente. Se fijan antes de mirar la prueba, para que la cantidad de alertas sea manejable por una oficina de supervisión o control."));
add(...figura("d13_cadena_prediccion.png", 16, "Cadena de predicción: de los indicadores a la probabilidad, el nivel, las razones y la evidencia."));
add(h3("Cómo se mide si acierta"));
add(ecuacion("AP = Σₙ (Rₙ − Rₙ₋₁) · Pₙ"));
add(p(`PR-AUC (precisión promedio): se ordenan las obras-mes de mayor a menor riesgo y se promedia la precisión P a medida que se recupera cada atraso (R es la exhaustividad). Un sistema al azar obtiene la tasa base. Es la métrica principal porque el atraso es raro ${c("saito")}.`));
add(ecuacion("Precisión@20 = TP₂₀ / N₂₀;   Exhaustividad@20 = TP₂₀ / TP"));
add(ecuacion("Lift@20 = Precisión@20 / π"));
add(p("N₂₀ son las obras-mes del 20 % superior, TP₂₀ los atrasos entre ellas, TP todos los atrasos y π la tasa base. Responden a la pregunta del supervisor: si reviso 1 de cada 5 obras, ¿cuántas tenían el problema y qué parte de los problemas encuentro?"));
add(ecuacion("Brier = (1 / N) · Σᵢ (pᵢ − yᵢ)²"));
add(p(`Error cuadrático de la probabilidad ${c("brier")}: mientras más bajo, mejor calibrada.`));
add(ecuacion("IC 95 % = [ percentil 2,5 ;  percentil 97,5 ]  de  θ*₁, θ*₂, …, θ*₁₀₀₀"));
add(ecuacion("p = P*( PR-AUC_M − PR-AUC_comparador ≤ 0 )"));
add(p(`Bootstrap por obra ${c("efron")}: se sortean obras completas con reemplazo mil veces y se recalcula la métrica θ. Para comparar dos modelos se usan las mismas obras sorteadas (bootstrap pareado) y el valor p es la proporción de sorteos en que el modelo propuesto no supera al comparador.`));
add(h3("Fórmulas del emparejador y del motor de plazos"));
add(ecuacion("cos(u, v) = (u · v) / (‖u‖ · ‖v‖)"));
add(p(`Similitud de significado entre el texto de la respuesta (u) y el de cada consulta candidata (v), representados con Sentence-BERT multilingüe ${c("sbert", "multiling")}. Se combina con días transcurridos, orden y si la consulta ya fue respondida en un LightGBM de pares.`));
add(ecuacion("d = min(f_respuesta, T) − f_consulta;   vencida ⇔ d > plazo,  plazo ∈ {5, 21}"));
add(p(`d son días calendario; el plazo es 5 días si responde el supervisor o inspector y 21 si interviene la entidad con el proyectista (RLCE art. 193; RLGCP art. 190) ${c("rlce", "rlgcp")}.`));
add(h2("3.9 Técnicas e instrumentos"));
add(vi("**Análisis documental de datos abiertos:** asientos y cuadernos del OECE, con huella SHA-256 de cada archivo descargado (resultados/linaje_oece.jsonl)."));
add(vi("**Análisis normativo:** lectura de los artículos 143, 193 y 203 del RLCE y 105 y 190 del RLGCP para fijar los plazos legales " + c("rlce", "rlgcp") + "."));
add(vi("**Experimentos computacionales reproducibles:** scripts de Python con semilla fija; los resultados se guardan como JSON versionado."));
add(vi("**Pruebas de software:** medición automatizada del prototipo con un navegador real (Playwright) y revisión visual en escritorio y móvil."));
add(h2("3.10 Procedimiento"));
add(nu("Descargar y depurar los asientos y cuadernos del OECE (paso 1).", "pasos"));
add(nu("Enlazar consultas y respuestas: primero por reglas; luego, con IA, las respuestas sin cita (paso 2).", "pasos"));
add(nu("Aplicar el motor de plazos y construir el panel obra-mes con lo que se sabía en cada fecha de corte (paso 3).", "pasos"));
add(nu("Agregar los indicadores de plazo y avance, contrato, ejecución financiera, historial y calendario con corte temporal, y medir los patrones descriptivos (pasos 3b y 3c).", "pasos"));
add(nu("Entrenar tres modelos candidatos y los comparadores en el pasado, elegir el final por PR-AUC de validación, calibrarlo y medirlo una sola vez en la prueba, con ablación por grupo (paso 4).", "pasos"));
add(nu("Exportar los resultados al prototipo web y desplegarlo (paso 5).", "pasos"));
add(nu("Generar gráficos, medir el prototipo y documentar (paso 6).", "pasos"));
add(...figura("d04_pipeline.png", 10, "Flujo de datos del sistema: cada paso deja archivos que el siguiente usa."));
add(h2("3.11 Tecnologías utilizadas"));
add(...tabla("Tecnologías y justificación", ["Tecnología", "Para qué", "Por qué se eligió"], [
  ["Python 3.12, DuckDB y Parquet", "Procesar 2,7 millones de asientos", "Rápido en una laptop, sin servidor de base de datos, gratuito"],
  ["Sentence-BERT multilingüe (paraphrase-multilingual-MiniLM-L12-v2)", "Representar el significado del texto en español", "Modelo abierto, liviano (corre en GPU de 8 GB), probado en español " + c("sbert", "multiling")],
  ["LightGBM", "Emparejador y predictor", "Muy bueno con datos tabulares, rápido y explicable " + c("lightgbm")],
  ["Calibración de Platt", "Que la probabilidad signifique lo que dice", "Simple y no cambia el orden de las obras " + c("platt")],
  ["Contribuciones por variable (TreeSHAP)", "Explicar cada alerta en palabras", "Método estándar para modelos de árboles " + c("shap")],
  ["HTML, CSS y JavaScript sin framework", "Prototipo web", "Cero dependencias, carga rápida, fácil de mantener"],
  ["GitHub y GitHub Pages", "Código, versiones y publicación", "Gratuito, con HTTPS y trazabilidad de cambios"],
], [3, 2.6, 3.6]));
add(h2("3.12 Método de evaluación"));
add(p("**Emparejador.** Se usan las respuestas que citan el número de asiento de la consulta: esa cita es la respuesta correcta. Se **borra el número del texto** y se pide al sistema que adivine la consulta. Se entrena con el resto del país y se prueba con Arequipa. Se compara con tres reglas: elegir al azar, elegir la consulta más reciente y elegir solo por similitud de texto."));
add(p(`**Predictor.** Partición temporal estricta (${F("g01_particion_temporal.png")}): entrenamiento con cortes hasta septiembre de 2025, validación de octubre a diciembre de 2025 (para detener el entrenamiento, calibrar, fijar umbrales y elegir el modelo) y prueba de enero a junio de 2026, el último mes con 60 días observados. Se entrenaron tres modelos LightGBM anidados: solo cuaderno (B3, actividad y señales), cuaderno más consultas (M1) y los ocho grupos (M). El final se eligió por PR-AUC de validación (${Object.entries(MOD.seleccion.pr_auc_validacion).map(([k, v]) => `${k === "M2" ? "M" : k} ${n(v, 3)}`).join("; ")}), por lo que se adoptó M. Se compara además con la tasa base (azar), la regla «más consultas vencidas = más riesgo» y una regresión logística con los mismos indicadores. Para medir el aporte de cada grupo se hizo una **ablación**: reentrenar el modelo quitando un grupo a la vez.`));
add(...figura("g01_particion_temporal.png", 15.5, "Partición temporal: el modelo nunca ve los meses de prueba."));
add(h2("3.13 Análisis de datos"));
add(p(`Los intervalos de confianza del 95 % se calculan con **bootstrap por obra** (1 000 remuestreos) ${c("efron")}: se remuestrean obras completas, porque una misma obra aparece en varios meses y sus filas no son independientes. Para comparar dos modelos se usa bootstrap **pareado** (los dos modelos sobre las mismas obras remuestreadas) y se reporta la diferencia de PR-AUC, su intervalo y la proporción de remuestreos en que la diferencia es menor o igual a cero (valor p unilateral).`));
add(h2("3.14 Consideraciones éticas"));
add(p(`Se usan solo datos abiertos publicados por el Estado ${c("oece", "ley27806")}. Los asientos pueden contener nombres, números de DNI o de colegiatura, correos y teléfonos; antes de publicar cualquier texto, el sistema los reemplaza por [persona], [documento], [colegiatura], [correo] y [teléfono] ${c("ley29733")}. Los nombres de entidades y empresas contratistas se mantienen porque son información pública de la contratación. El sistema **no acusa ni sanciona**: entrega una prioridad de revisión con su evidencia, y toda alerta debe verificarse con el expediente. Una «consulta sin respuesta en el cuaderno» no prueba que no se haya respondido, porque la respuesta pudo darse por carta.`));

// 4. Propuesta y prototipo
add(salto(), h1("4. Propuesta y desarrollo del prototipo"));
add(recuadro("La idea en una frase", [
  "Un inspector virtual que lee el cuaderno de obra (la «caja negra» de cada obra pública), detecta qué consultas están trabadas y quién debe responderlas, y avisa antes de que la obra caiga en atraso, con la prueba escrita.",
  "La metáfora: cuando un avión cae, se lee la caja negra para saber qué pasó. En una obra, la caja negra es el cuaderno de obra. Hoy se lee cuando la obra ya está atrasada; este sistema la lee mientras la obra está viva.",
]));
add(espacio());
add(h2("4.1 Requerimientos"));
add(...tabla("Requerimientos funcionales y no funcionales", ["Código", "Requerimiento", "Cómo se cumple"], [
  ["RF1", "Listar las obras en ejecución de Arequipa ordenadas por riesgo, con búsqueda, filtros y orden por columna", `Vista «Panorama» (${F("c01_panorama.png")})`],
  ["RF2", "Mostrar el riesgo de atraso a 60 días, su nivel, su evolución mensual y las razones en lenguaje simple", `Ficha de obra (${F("c02_ficha.png")})`],
  ["RF3", "Mostrar cada consulta con su estado, días, plazo y responsable", "Sección «Consultas del residente: quién está trabando»"],
  ["RF4", "Mostrar la prueba escrita: texto del asiento de la consulta y de la respuesta", "Hojas del cuaderno con número de asiento sellado"],
  ["RF5", "Mostrar los indicadores clave de plazo, avance, dinero e historial, y la historia del cuaderno", "Secciones «Indicadores clave» e «Historia del cuaderno»"],
  ["RF6", "Explicar las fórmulas, las métricas, los indicadores y un ejemplo resuelto", `Vista «Cómo predice» (${F("c06_formulas.png")})`],
  ["RNF1", "Privacidad: no publicar datos personales", "Anonimización automática del texto"],
  ["RNF2", "Rendimiento: la lista debe aparecer en menos de 2 s", `Mediana medida: ${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms`],
  ["RNF3", "Seguridad: sitio estático, sin servidor ni formularios que guarden datos", "Política de seguridad de contenido (CSP) y HTTPS de GitHub Pages"],
  ["RNF4", "Accesibilidad y uso en móvil", "Diseño adaptable, foco visible de teclado, textos en lenguaje simple"],
  ["RNF5", "Reproducibilidad y costo cero", "Scripts versionados, datos abiertos y alojamiento gratuito"],
], [1, 4.6, 3.6]));
add(h2("4.2 Diseño de la solución"));
add(p(`La lógica de la propuesta es responder, para cada obra, tres preguntas que cualquier supervisor entiende: **¿se va a atrasar?**, **¿quién la está trabando?** y **¿qué está pasando?** Cada respuesta se acompaña del asiento del cuaderno que la respalda. La ${F("d02_proceso_actual_vs_propuesto.png")} compara el proceso actual con el propuesto.`));
add(...figura("d02_proceso_actual_vs_propuesto.png", 11.5, "Proceso actual frente al proceso con Caja Negra de Obra."));
add(h2("4.3 Arquitectura"));
add(p(`La arquitectura tiene cinco capas (${F("d03_arquitectura.png")}). Las **fuentes** son archivos abiertos del OECE, el MEF, INFOBRAS y SEACE. La **ingesta** los depura y registra su huella SHA-256. La **inteligencia** tiene cuatro componentes en cadena: el emparejador, el motor de plazos, el panel de ${NVAR} indicadores y el predictor. La **publicación** genera archivos JSON pequeños, y la **presentación** es un sitio web estático que los lee. No hay servidor de aplicaciones ni base de datos en línea: esto reduce el costo y la superficie de ataque a casi cero.`));
add(...figura("d03_arquitectura.png", 11, "Arquitectura de software por capas."));
add(h2("4.4 Modelo de datos"));
add(...figura("d08_modelo_datos.png", 15, "Modelo de datos: del cuaderno y sus asientos a la consulta auditada, la fila obra-mes con sus indicadores y la predicción."));
add(h2("4.5 Componentes"));
add(...tabla("Módulos y responsabilidades", ["Componente", "Responsabilidad", "¿Usa IA?", "Archivo"], [
  ["Ingesta", "Cargar y depurar asientos y cuadernos; marcar el primer atraso legal", "No", "scripts/p01_preparar.py"],
  ["Emparejador", "Unir cada respuesta con la consulta que contesta", "Sí", "scripts/p02_emparejar.py"],
  ["Motor de plazos", "Aplicar 5 o 21 días, dar el veredicto y el responsable", "No (reglas legales)", "scripts/p03_plazos_y_panel.py"],
  ["Panel obra-mes", "Calcular las señales del cuaderno y de las consultas con lo que se sabía en cada mes", "No", "scripts/p03_plazos_y_panel.py"],
  ["Indicadores externos", "Agregar plazo y avance, contrato, SIAF, historial y calendario con corte temporal; medir patrones", "No", "scripts/p03b_indicadores.py, p03c_patrones.py"],
  ["Catálogo de indicadores", "Fórmula, fuente, razón y frase de cada indicador, usado por el modelo, la web y el informe", "No", "src/caja_negra/indicadores.py"],
  ["Predictor", "Estimar el riesgo de atraso a 60 días, calibrarlo, explicarlo y medir la ablación por grupo", "Sí", "scripts/p04_modelo.py"],
  ["Exportador", "Generar los JSON y anonimizar los textos", "No", "scripts/p05_exportar.py"],
  ["Prototipo web", "Mostrar panorama, ficha de obra y ficha técnica del modelo", "No", "web/ (módulos JS)"],
], [2, 4.2, 1.4, 3]));
add(h3("Emparejador consulta–respuesta"));
add(p(`Primero intenta reglas simples: si la respuesta cita el número de asiento («en atención al asiento N.° 157»), el número de consulta («consulta N.° 14») o «el asiento anterior», el enlace es directo. Si no hay cita, interviene la IA (${F("d05_emparejador.png")}). Toma las consultas anteriores del mismo cuaderno de los últimos 180 días (en promedio ${n(E.candidatos_promedio, 1)} candidatas en Arequipa). Para cada una calcula la similitud de significado con Sentence-BERT, los días transcurridos, su orden y si ya fue respondida. Con esas señales, un LightGBM elige la candidata más probable. El enlace solo se acepta si la confianza llega a ${n(E.umbral, 2)}, un umbral fijado en validación para lograr 90 % de precisión.`));
add(...figura("d05_emparejador.png", 10, "Flujo del emparejador: primero reglas, luego IA con umbral de confianza."));
add(h3("Motor de plazos"));
add(p(`Para cada consulta del residente, el motor decide el plazo: 21 días calendario si la respuesta menciona al proyectista, una modificación del expediente o que se elevó a la entidad, y 5 días en los demás casos ${c("rlce", "rlgcp")}. Luego compara los días transcurridos con ese plazo y entrega uno de cuatro veredictos (${F("d06_motor_plazos.png")}). Los plazos se cuentan en días calendario, como manda la norma para la ejecución contractual (RLCE art. 143; RLGCP art. 105.3).`));
add(...figura("d06_motor_plazos.png", 9, "Reglas del motor de plazos y sus cuatro veredictos."));
add(h3("Predictor de atraso a 60 días"));
add(p(`Cada mes, para cada obra, se calculan los ${NVAR} indicadores de la sección 3.7. Un LightGBM de ${MOD.arboles.final} árboles aprende qué combinación antecede al atraso legal; se calibra con Platt y asigna un nivel: **alto** (20 % superior de la validación), **medio** (30 % siguiente) o **bajo**. Las contribuciones TreeSHAP de cada indicador se traducen a frases («Lleva 40 días sin anotaciones en el cuaderno», «Consumió 35 puntos más de plazo que de avance») para explicar cada alerta. Las fórmulas completas están en la sección 3.8.`));
add(h2("4.6 Implementación"));
add(vi("**Sin fuga de información:** todas las señales del mes T usan solo asientos con fecha menor o igual a T y respuestas conocidas hasta T."));
add(vi("**Etiqueta gratuita para la IA:** el emparejador aprende de 18 130 respuestas del país que sí citan el número, sin anotar nada a mano."));
add(vi("**Ajustes solo con validación:** el umbral del emparejador, la detención del predictor y la calibración se decidieron sin mirar la prueba."));
add(vi("**Orden determinista:** todas las consultas a datos fijan su orden, para que el texto y su representación numérica nunca se desalineen."));
add(vi("**Anonimización antes de publicar:** el texto que se muestra pasa por reglas que enmascaran nombres, documentos y contactos."));
add(h2("4.7 Integración y despliegue"));
add(p(`El pipeline se ejecuta una vez al mes en el equipo del proyecto (GPU de 8 GB para las representaciones de texto). El resultado son archivos JSON que se publican, junto con la interfaz, en GitHub Pages (${F("d10_despliegue.png")}). No se necesita servidor ni base de datos en línea, y el costo de operación es cero.`));
add(...figura("d10_despliegue.png", 6, "Diagrama de despliegue."));
add(h2("4.8 Funcionamiento del prototipo"));
add(p(`La ${F("d09_flujo_usuario.png")} muestra el flujo de uso. La interfaz es oscura, sobria y de tres pantallas. En **Panorama** el usuario ve las obras ordenadas por riesgo, con el cambio frente al mes anterior y lo que más pesa, y puede buscar, filtrar y ordenar. En la **ficha de obra** ve la probabilidad, su evolución mes a mes, las razones (barras que suben o bajan el riesgo), los indicadores clave, las consultas trabadas con su responsable y, al abrir una consulta, el texto del asiento como prueba. En **Cómo predice** encuentra las fórmulas, un ejemplo resuelto, las métricas con su intervalo, la ablación y el catálogo de indicadores. Para quien no conoce el tema, un recorrido guiado con globos señala cada parte de la pantalla, y los términos técnicos (atraso legal, consulta vencida, PR-AUC) tienen un botón «?» con su definición en palabras simples.`));
add(...figura("d09_flujo_usuario.png", 15, "Flujo de uso del sistema."));
add(...figura("c01_panorama.png", 15.5, "Vista «Panorama»: obras en ejecución de Arequipa ordenadas por riesgo, con contexto oficial de la Contraloría."));
add(...figura("c02_ficha.png", 15.5, "Ficha de obra: probabilidad, razones (contribuciones TreeSHAP) y evolución mensual del riesgo con los umbrales de nivel."));
add(...figura("c03_indicadores.png", 15.5, "Ficha de obra: indicadores clave de plazo, avance, dinero, historial y calendario."));
add(...figura("c04_consultas.png", 13, "Ficha de obra: consultas del residente con su veredicto, responsable y la prueba escrita del asiento."));
add(...figura("c06_formulas.png", 15.5, "Vista «Cómo predice»: las fórmulas del sistema explicadas en el propio prototipo."));

// 5. Resultados
add(salto(), h1("5. Resultados"));
add(h2("5.1 Resultados del diagnóstico"));
add(p(`De las ${n(QA.consultas_residente)} consultas del residente en Arequipa, solo ${n(QA.respondidas_enlazadas)} (${n(QA.pct_respondidas_enlazadas, 1)} %) tienen una respuesta enlazada en el cuaderno (${F("g03_estado_consultas.png")}). Las demás pudieron responderse por carta o no responderse: el cuaderno no permite distinguirlo, y eso ya es un hallazgo para la gestión de la información de la obra. Entre las que sí tienen respuesta, la mediana es de ${n(QA.dias_respuesta.mediana)} días, pero el 10 % más lento tarda ${n(QA.dias_respuesta.p90)} días o más, y el ${n(QA.pct_tarde_entre_respondidas, 1)} % llegó fuera de plazo (${F("g02_dias_respuesta.png")}). En el país, las cifras son parecidas: ${n(QN.pct_respondidas_enlazadas, 1)} % con respuesta enlazada y ${n(QN.pct_tarde_entre_respondidas, 1)} % fuera de plazo.`));
add(...figura("g03_estado_consultas.png", 16, "Estado de las consultas del residente en Arequipa al 31 de agosto de 2026."));
add(...figura("g02_dias_respuesta.png", 15, "Días entre la consulta y su respuesta, con los plazos legales."));
const rutaP = QA.por_ruta["Entidad y proyectista"], rutaS = QA.por_ruta["Supervisor o inspector"];
add(...tabla("Veredicto de las consultas del residente en Arequipa según quién debe responder", ["Responsable", "A tiempo", "Tarde", "En plazo", "Sin respuesta en el cuaderno"], [
  ["Supervisor o inspector (5 días)", n(rutaS["A tiempo"]), n(rutaS["Tarde"]), n(rutaS["En plazo"]), n(rutaS["Sin respuesta en el cuaderno"])],
  ["Entidad y proyectista (21 días)", n(rutaP["A tiempo"]), n(rutaP["Tarde"]), n(rutaP["En plazo"]), n(rutaP["Sin respuesta en el cuaderno"])],
], [3.2, 1.4, 1.4, 1.4, 2.4], "Una consulta sin respuesta enlazada se asigna por defecto al supervisor, porque la ruta larga solo se reconoce por el texto de la respuesta."));
add(h2("5.2 Resultados de implementación"));
add(vi(`Pipeline completo de 6 pasos, reproducible, que procesa ${n(P1.nacional.asientos)} asientos.`));
add(vi(`Emparejador que enlazó ${n(EMP.pares_por_metodo.nacional.cita_asiento + EMP.pares_por_metodo.nacional.numero_consulta + EMP.pares_por_metodo.nacional.asiento_anterior)} pares por reglas y ${n(EMP.pares_por_metodo.nacional.ia_semantica)} con IA en el país (en Arequipa: ${n(EMP.pares_por_metodo.arequipa.cita_asiento + EMP.pares_por_metodo.arequipa.numero_consulta + EMP.pares_por_metodo.arequipa.asiento_anterior)} y ${n(EMP.pares_por_metodo.arequipa.ia_semantica)}).`));
add(vi(`Panel de ${n(PLZ.panel.filas)} obras-mes de ${n(PLZ.panel.obras)} obras con ${NVAR} indicadores cada una, catalogados con su fórmula y fuente.`));
add(vi(`Prototipo web desplegado con ${n(RES.obras)} obras de Arequipa en ejecución al ${RES.corte}: ${n(RES.por_nivel.ALTO)} de riesgo alto, ${n(RES.por_nivel.MEDIO)} medio y ${n(RES.por_nivel.BAJO)} bajo.`));
add(h2("5.3 Resultados de evaluación"));
add(h3("Emparejador"));
add(p(`Con ${n(E.respuestas)} respuestas de Arequipa a las que se borró el número citado, la IA eligió la consulta correcta en el **${pc(E.modelo_ia)}** de los casos (IC 95 %: ${pc(E.modelo_ia_ic95[0])} a ${pc(E.modelo_ia_ic95[1])}). La regla «la más reciente» acertó ${pc(E.regla_mas_reciente)}, la similitud de texto sola ${pc(E.solo_similitud_texto)} y el azar ${pc(E.azar)} (${F("g04_emparejador.png")}). Con el umbral de confianza, la IA enlaza el ${pc(E.cobertura_con_umbral)} de las respuestas con ${pc(E.precision_con_umbral)} de precisión en Arequipa (en validación: ${pc(EV.cobertura_con_umbral)} y ${pc(EV.precision_con_umbral)}).`));
add(...figura("g04_emparejador.png", 15, "Exactitud del emparejador en Arequipa frente a reglas simples."));
add(h3("Predictor"));
const filaM = (nombre, x, negrita) => {
  const b = (t) => (negrita ? `**${t}**` : t);
  return [b(nombre), b(x.pr_auc_ic95 && x.roc_auc !== 0.5 ? `${n(x.pr_auc, 3)} (${n(x.pr_auc_ic95[0], 3)}–${n(x.pr_auc_ic95[1], 3)})` : n(x.pr_auc, 3)),
    b(n(x.roc_auc, 3)), b(pc(x.precision_top20)), b(pc(x.recall_top20)), b(`${n(x.lift_top20, 2)}×`), b(x.brier == null ? "—" : n(x.brier, 4))];
};
const NOMBRES = { "B0 Tasa base": "B0 Revisión al azar (tasa base)", "B1 Regla: consultas vencidas": "B1 Regla: consultas vencidas", "B2 Regresión logística": "B2 Regresión logística (53 indicadores)",
  "B3 LightGBM solo cuaderno": "B3 LightGBM solo cuaderno", "M1 LightGBM cuaderno + consultas": "M1 LightGBM cuaderno + consultas", "M Caja Negra": "M Caja Negra (8 grupos)" };
for (const [amb, R, titulo] of [["arequipa", AQ, "Desempeño en la prueba de Arequipa (enero a junio de 2026)"], ["nacional", NA, "Desempeño en la prueba nacional (enero a junio de 2026)"]]) {
  add(...tabla(titulo, ["Método", "PR-AUC (IC 95 %)", "ROC-AUC", "Precisión@20 %", "Exhaust.@20 %", "Lift@20 %", "Brier"],
    Object.entries(R.modelos).map(([k, x]) => filaM(NOMBRES[k], x, k === "M Caja Negra")),
    [2.8, 2.1, 1, 1.3, 1.3, 1, 1], `Prueba ${amb === "arequipa" ? "de Arequipa" : "nacional"}: ${n(R.filas)} obras-mes de ${n(R.obras)} obras, con ${n(R.positivos)} atrasos (tasa base ${pc(R.prevalencia)}). El Brier solo se reporta para los modelos calibrados.`));
}
add(...figura("g05_comparacion_modelos.png", 15.5, "PR-AUC de cada método en Arequipa, con su intervalo de confianza."));
add(p(`En palabras simples: si un equipo revisa cada mes el 20 % de las obras que el sistema marca como más riesgosas, **${pc(M.precision_top20)}** de ellas caerán en atraso en los 60 días siguientes. Revisando al azar serían ${pc(AQ.prevalencia)}: unas **${n(M.lift_top20, 1)} veces más** eficacia con el mismo esfuerzo, y ese 20 % concentra el **${pc(M.recall_top20)}** de los atrasos. En el país, con ${n(NA.positivos)} atrasos, el modelo obtuvo una PR-AUC de ${n(MN.pr_auc, 3)} y una ROC-AUC de ${n(MN.roc_auc, 3)}, con un lift de ${n(MN.lift_top20, 1)} veces. En Arequipa la PR-AUC del modelo final (${n(M.pr_auc, 3)}) quedó por debajo de la de M1 (${n(M1.pr_auc, 3)}) y de B3 (${n(B3.pr_auc, 3)}), aunque con intervalos que se superponen por completo; como el modelo se eligió en validación y no en la prueba, se reporta tal cual.`));
add(h3("Qué indicadores pesan más"));
add(p(`La ${F("g08_importancia_grupos.png")} muestra cuánto usa el modelo cada grupo y la ${F("g11_top_indicadores.png")} los quince indicadores individuales con más peso. La actividad del cuaderno (${n(IG.actividad, 1)} %) y el contrato (${n(IG.contrato, 1)} %) encabezan, seguidos del plazo y avance (${n(IG.plazo, 1)} %), las señales formales (${n(IG.senales, 1)} %), las consultas (${n(IG.consultas, 1)} %), la ejecución financiera (${n(IG.financiera, 1)} %), el historial (${n(IG.historial, 1)} %) y el calendario (${n(IG.calendario, 1)} %). La importancia dice cuánto se usa un indicador, no cuánto mejora la predicción; eso lo mide la ablación.`));
add(...figura("g08_importancia_grupos.png", 14, "Importancia de cada grupo de indicadores en el modelo final (gain)."));
add(...figura("g11_top_indicadores.png", 14, "Los quince indicadores con más peso, coloreados por grupo."));
add(h3("Ablación: qué aporta cada grupo"));
add(...tabla("Ablación: PR-AUC al reentrenar el modelo sin cada grupo", ["Grupo quitado", "Importancia", "Validación", "Caída", "Arequipa", "Caída", "Nacional", "Caída"],
  Object.keys(GR).sort((a, b) => IG[b] - IG[a]).map((g) => [GR[g], `${n(IG[g], 1)} %`,
    n(AB[g].validacion.pr_auc_sin_grupo, 3), `${AB[g].validacion.caida > 0 ? "+" : ""}${n(AB[g].validacion.caida, 4)}`,
    n(AB[g].arequipa.pr_auc_sin_grupo, 3), `${AB[g].arequipa.caida > 0 ? "+" : ""}${n(AB[g].arequipa.caida, 4)}`,
    n(AB[g].nacional.pr_auc_sin_grupo, 3), `${AB[g].nacional.caida > 0 ? "+" : ""}${n(AB[g].nacional.caida, 4)}`]),
  [2.4, 1, 1, 1, 1, 1, 1, 1], `Modelo completo: validación ${n(MOD.ablacion.pr_auc_modelo_8_grupos.validacion, 3)}, Arequipa ${n(MOD.ablacion.pr_auc_modelo_8_grupos.arequipa, 3)}, nacional ${n(MOD.ablacion.pr_auc_modelo_8_grupos.nacional, 3)}. Caída positiva: el grupo ayuda; negativa: sin él se obtuvo igual o más PR-AUC en esa muestra.`));
add(...figura("g09_ablacion.png", 15.5, "Ablación por grupo en validación, prueba nacional y prueba de Arequipa."));
add(p(`En validación, quitar cualquiera de los ocho grupos empeora el modelo, lo que justifica conservarlos todos. En la prueba nacional los aportes más claros son las señales formales (${n(AB.senales.nacional.caida, 3)}), el plazo y avance (${n(AB.plazo.nacional.caida, 3)}) y la actividad (${n(AB.actividad.nacional.caida, 3)}). En Arequipa, con solo ${n(AQ.positivos)} atrasos, la actividad (${n(AB.actividad.arequipa.caida, 3)}) y las consultas (${n(AB.consultas.arequipa.caida, 3)}) ayudan, y los demás grupos muestran caídas negativas pequeñas que están dentro de la variación por muestreo. Los grupos externos (financiero, historial, calendario, contrato) pesan en el modelo pero no mejoran la prueba nacional por sí solos: su valor está en combinarse con las señales del cuaderno.`));
add(h3("Ejemplo resuelto: cómo se calculó el riesgo de una obra"));
const zEj = Math.log(OBRA1.riesgo.probabilidad / (1 - OBRA1.riesgo.probabilidad)), FEj = (zEj - MJ.platt.B) / MJ.platt.A;
const restoEj = FEj - MJ.base_logit - OBRA1.riesgo.aportes.reduce((a, x) => a + x.peso, 0);
add(p(`La obra de mayor riesgo al corte del ${RES.corte} es «${OBRA1.nombre.slice(0, 140)}${OBRA1.nombre.length > 140 ? "…" : ""}» (${OBRA1.entidad}). La tabla siguiente aplica las ecuaciones de la sección 3.8 con sus valores reales y la ${F("g10_ejemplo_cascada.png")} lo muestra como cascada.`));
add(...tabla("Ejemplo resuelto: de los indicadores a la probabilidad", ["Término", "Indicador y valor en la obra", "Grupo", "φ (logit)"], [
  ["φ₀", "Base común del modelo", "—", n(MJ.base_logit, 3)],
  ...OBRA1.riesgo.aportes.map((a) => [a.variable, a.frase, a.grupo, `${a.peso > 0 ? "+" : ""}${n(a.peso, 3)}`]),
  ["Resto", `Los otros ${NVAR - OBRA1.riesgo.aportes.length} indicadores sumados`, "—", `${restoEj > 0 ? "+" : ""}${n(restoEj, 3)}`],
  ["**F(x)**", "**Puntaje total = φ₀ + Σ φⱼ**", "", `**${n(FEj, 3)}**`],
  ["**p**", `**σ(${n(MJ.platt.A, 3)} × (${n(FEj, 3)}) + ${n(MJ.platt.B, 3)})**`, "", `**${pc(OBRA1.riesgo.probabilidad)}**`],
  ["Nivel", `p ≥ ${n(100 * MOD.niveles.umbral_alto, 2)} % → ${OBRA1.riesgo.nivel}; ${n(OBRA1.riesgo.veces_tasa_base, 1)} veces la tasa base de Arequipa`, "", OBRA1.riesgo.nivel],
], [1.7, 4.4, 2, 1.2], "Valores tomados del archivo publicado del prototipo (web/data/obra/<id>.json). «Resto» se obtiene despejando la ecuación de Platt."));
add(...figura("g10_ejemplo_cascada.png", 15.5, "Cascada de contribuciones del ejemplo resuelto."));
add(h3("Niveles, calibración y anticipación"));
add(p(`Los niveles separan bien el riesgo real (${F("g06_niveles.png")}). En la prueba de Arequipa, el ${pc(NIV.ALTO.tasa_observada)} de las obras-mes de nivel alto cayó en atraso, frente al ${pc(NIV.MEDIO.tasa_observada)} del medio y el ${pc(NIV.BAJO.tasa_observada)} del bajo. Las probabilidades están razonablemente calibradas (${F("g07_calibracion.png")}), y el puntaje de Brier mejora el de la tasa base (${n(M.brier, 4)} frente a ${n(B0.brier, 4)}). De las ${n(ANT.obras_con_evento)} obras de Arequipa que cayeron en atraso durante la prueba, ${n(ANT.alertadas_antes)} (${n(ANT.pct_alertadas, 1)} %) recibieron una alerta alta en algún cierre de mes de los 120 días previos, con una mediana de **${n(ANT.dias_anticipacion_mediana, 1)} días** de anticipación (cuartiles de ${n(ANT.dias_anticipacion_p25_p75[0])} a ${n(ANT.dias_anticipacion_p25_p75[1])} días). En el país, ${n(ANTN.pct_alertadas, 1)} % con una mediana de ${n(ANTN.dias_anticipacion_mediana)} días.`));
add(...figura("g06_niveles.png", 11, "Proporción de atrasos observados según el nivel asignado (Arequipa)."));
add(...figura("g07_calibracion.png", 8, "Calibración: probabilidad estimada frente a lo observado."));
add(h3("Prototipo"));
add(...tabla("Ficha de evaluación del prototipo", ["Dimensión", "Indicador", "Línea base", "Resultado", "Método de medición"], [
  ["Precisión", "Acierto al revisar el 20 % superior (Arequipa)", pc(AQ.prevalencia) + " (azar)", pc(M.precision_top20), "Prueba fuera de tiempo"],
  ["Precisión", "Exactitud del emparejador", pc(E.regla_mas_reciente) + " (regla)", pc(E.modelo_ia), "Respuestas con número borrado"],
  ["Rendimiento", "Tiempo hasta mostrar la lista", "< 2 000 ms (requisito)", `${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms`, "Mediana de 5 cargas, Edge"],
  ["Rendimiento", "Tiempo para abrir una ficha", "< 2 000 ms (requisito)", `${n(WEB.ms_abrir_ficha_mediana)} ms`, "Mediana de 5 cargas, Edge"],
  ["Eficiencia", "Peso de los datos", "—", `Lista ${n(WEB.peso_obras_json_kb, 1)} KB; ficha mediana ${n(WEB.peso_ficha_kb_mediana, 1)} KB`, "Tamaño de archivos"],
  ["Seguridad", "Errores y bloqueos de política de contenido", "0", n(WEB.errores_consola), "Consola del navegador"],
  ["Seguridad", "Datos personales publicados", "0", "Enmascarados automáticamente", "Reglas de anonimización"],
  ["Usabilidad", "Escala SUS con supervisores", "≥ 68", "Pendiente", "Prueba con usuarios (trabajo futuro)"],
  ["Satisfacción", "Utilidad percibida por OCI o supervisores", "—", "Pendiente", "Entrevista breve (trabajo futuro)"],
], [1.6, 2.8, 1.7, 1.8, 2.2], "Las dimensiones de usabilidad y satisfacción no se midieron con usuarios reales; se declaran como pendientes y no se reportan valores inventados."));
add(h2("5.4 Resultados cuantitativos y cualitativos"));
add(p(`En lo cuantitativo, el sistema cumple su función con métricas medidas fuera de tiempo (tablas de desempeño de esta sección). En lo cualitativo, la lectura de las fichas muestra patrones que un supervisor reconoce. Hay obras con consultas repetidas sobre el mismo punto del expediente (por ejemplo, incompatibilidades entre planos y especificaciones), que esperan respuesta por semanas. Y hay respuestas que derivan la consulta a la entidad y al proyectista, por lo que la ruta larga explica buena parte de las demoras largas.`));
add(h2("5.5 Comparación antes y después"));
add(...tabla("Antes y después: el mismo esfuerzo de revisión", ["Situación", "Cómo se elige qué revisar", "Obras revisadas que caen en atraso", "Información disponible"], [
  ["Antes (sin sistema)", "Al azar o por reclamos", pc(AQ.prevalencia), "Ninguna medición de plazos de consulta"],
  ["Con regla simple", "Más consultas vencidas", pc(B1.precision_top20), "Conteo sin contexto"],
  ["Con Caja Negra", "Riesgo estimado y explicado", pc(M.precision_top20), "Riesgo, responsable y prueba escrita"],
], [2.2, 2.6, 2.4, 2.8], "Se compara la precisión al revisar el 20 % de las obras-mes de la prueba de Arequipa."));
add(h2("5.6 Análisis estadístico"));
add(...tabla("Comparaciones pareadas de PR-AUC del modelo Caja Negra (bootstrap por obra, 1 000 remuestreos)", ["Comparado con", "Diferencia Arequipa (IC 95 %)", "p unilateral", "Diferencia Perú (IC 95 %)", "p unilateral"], [
  ...Object.keys(PAR).map((k) => [k.replace(/^B\d /, ""), `${n(PAR[k].diferencia_pr_auc, 3)} (${n(PAR[k].ic95[0], 3)} a ${n(PAR[k].ic95[1], 3)})`, n(PAR[k].p_unilateral, 3),
    `${n(PARN[k].diferencia_pr_auc, 3)} (${n(PARN[k].ic95[0], 3)} a ${n(PARN[k].ic95[1], 3)})`, n(PARN[k].p_unilateral, 3)]),
], [2.6, 2.6, 1.2, 2.6, 1.2]));
add(p(`**Lectura honesta.** En el país, el modelo de ocho grupos supera con significancia a la tasa base, a la regla (p ${PARN["B1 Regla: consultas vencidas"].p_unilateral < 0.001 ? "< 0,001" : "= " + n(PARN["B1 Regla: consultas vencidas"].p_unilateral, 3)}), a la regresión logística (p = ${n(PARN["B2 Regresión logística"].p_unilateral, 3)}) y al modelo solo con el cuaderno (p = ${n(PARN["B3 LightGBM solo cuaderno"].p_unilateral, 3)}); frente a M1 la ventaja no es concluyente (p = ${n(PARN["M1 LightGBM cuaderno + consultas"].p_unilateral, 3)}). En Arequipa, con ${n(AQ.positivos)} atrasos en la prueba, solo la diferencia frente al azar es concluyente; frente a los demás modelos los intervalos incluyen el cero y M1 obtiene un valor numéricamente mayor. Por eso H2 y H3 se aceptan para el país y quedan sin confirmar para Arequipa.`));

// 6. Discusión
add(salto(), h1("6. Discusión"));
add(h2("6.1 Principales hallazgos"));
add(vi("**H1 se cumple.** El emparejador con IA supera a la regla de proximidad en 15 puntos porcentuales, con un intervalo que no se cruza con ella."));
add(vi("**H2 se cumple frente al azar y, en el país, frente a la regla y la regresión logística.** En Arequipa la diferencia frente a esos comparadores no es concluyente por el tamaño de la muestra."));
add(vi("**H3 se cumple en el país y no se confirma en Arequipa:** sumar los grupos externos (plazo, contrato, dinero, historial, calendario) y las consultas al cuaderno mejora la PR-AUC nacional con significancia, pero en Arequipa M1 rinde igual o mejor."));
add(vi("**El hallazgo de gestión más fuerte** es que casi dos de cada tres consultas del residente no tienen una respuesta trazable en el cuaderno."));
add(h2("6.2 Comparación con estudios previos"));
add(p(`Los estudios de causas ${c("velasquez", "julca", "ahp", "carrasco")} señalan el expediente técnico y la ejecución como fuente del atraso; este estudio lo confirma desde otro ángulo, porque las consultas nacen justamente de vacíos del expediente. A diferencia de esos trabajos, la lectura aquí es automática y mensual. La capacidad de discriminación del predictor (ROC-AUC ${n(M.roc_auc, 3)} en Arequipa y ${n(MN.roc_auc, 3)} en el país) está en el rango moderado que reportan los modelos peruanos con datos estructurados ${c("vilchez")}. Esos modelos responden otra pregunta (riesgo general de paralización) con otras fuentes y no son directamente comparables. El aporte aquí no es una métrica más alta, sino una señal nueva y explicada con su prueba escrita. En línea con los trabajos sobre bitácoras con IA ${c("corea", "cibw78")}, se confirma que el texto de obra puede convertirse en datos útiles, ahora en español y conectado con plazos legales.`));
add(h2("6.3 Explicación de los resultados"));
add(p(`¿Por qué la similitud de texto sola (${pc(E.solo_similitud_texto)}) rinde menos que la regla «la más reciente» (${pc(E.regla_mas_reciente)})? Porque dentro de un mismo cuaderno muchas consultas tratan el mismo tema y se parecen entre sí. La IA funciona cuando combina el significado con el contexto (cuándo se hizo la consulta y si ya fue respondida), y por eso llega a ${pc(E.modelo_ia)}. En el predictor, los grupos más usados son la actividad del cuaderno y el contrato: una obra cuyo cuaderno cambia de ritmo suele estar cambiando de situación, y las obras grandes tienen más frentes. La ablación muestra que las señales formales (ampliaciones previas, penalidades, órdenes) y el plazo consumido frente al avance son los que más mejoran la predicción nacional, en línea con la idea de que un plazo ya tensionado vuelve a tensionarse. Las consultas ayudan en Arequipa, quizás porque allí las demoras son algo mayores (${n(QA.pct_tarde_entre_respondidas, 1)} % tarde frente a ${n(QN.pct_tarde_entre_respondidas, 1)} % en el país), aunque esta explicación no se probó.`));
add(h2("6.4 Implicaciones tecnológicas y organizacionales"));
add(vi("**Para la supervisión y la entidad:** una rutina mensual de 15 minutos. Abrir la lista, revisar las obras de riesgo alto y pedir la absolución de las consultas vencidas, con el número de asiento en la mano."));
add(vi("**Para el control:** el Órgano de Control Institucional puede orientar su control simultáneo hacia obras con consultas trabadas, con evidencia documental."));
add(vi("**Para la gestión de TI del Estado:** el valor no requiere nuevos sistemas transaccionales, sino gobernar mejor los datos ya publicados. Si el OECE publicara el identificador de asiento, el campo ASIENTO_ENLAZADO sería utilizable y la auditoría sería casi exacta."));
add(vi("**Costo y riesgo:** cero costo de licencias y alojamiento; el riesgo principal es el mal uso de una alerta como acusación, que se controla con el mensaje explícito de que es una prioridad de revisión."));
add(h2("6.5 Contribución"));
add(p("El estudio aporta evidencia nueva: cuánto tardan las respuestas a consultas, cuántas no quedan en el cuaderno, y que esa información, leída con IA, ayuda a anticipar el atraso en Arequipa. También aporta un método reutilizable para enlazar documentos de obra sin anotación manual, y un prototipo público de costo cero."));
add(h2("6.6 Fortalezas"));
add(vi("Datos oficiales completos (no una muestra), con huella SHA-256 de cada archivo."));
add(vi("Evaluación fuera de tiempo, con cuatro comparadores e intervalos de confianza por obra."));
add(vi("Plazos tomados del texto legal vigente, no supuestos."));
add(vi("Cada alerta se explica en lenguaje simple y se respalda con el asiento original."));
add(h2("6.7 Limitaciones"));
add(vi("**La etiqueta es el atraso legal** (valorización menor al 80 % o calendario acelerado), no la paralización. Es un evento anterior y relacionado, pero no idéntico."));
add(vi("**Cobertura:** solo obras por contrata con cuaderno digital, desde junio de 2024. No incluye obras por administración directa."));
add(vi("**Respuestas fuera del cuaderno:** las respuestas por carta no se ven; por eso el veredicto se llama «sin respuesta en el cuaderno»."));
add(vi("**Ruta larga por palabras clave:** la ruta con proyectista se reconoce por el texto de la respuesta; las consultas sin respuesta se asignan por defecto al supervisor."));
add(vi(`**Muestra de Arequipa pequeña:** ${n(AQ.positivos)} atrasos en la prueba; por eso varios intervalos son amplios.`));
add(vi("**Grado de libertad del investigador:** una primera configuración del predictor (sin detención temprana y con calibración isotónica) mostró en Arequipa una diferencia de −0,015 en PR-AUC para las variables de consultas. La configuración final se adoptó por razones metodológicas (usar la validación para detener y una calibración que no cree empates), pero después de haber visto aquel resultado. Se declara para que el lector lo pondere."));
add(vi("**El conjunto de oro del emparejador** son respuestas con cita explícita, que pueden ser más fáciles que las respuestas sin cita."));
add(vi("**No se evaluó con usuarios reales** (usabilidad y satisfacción pendientes), y la anonimización por reglas puede tener omisiones."));
add(vi("**Cobertura desigual de los indicadores externos:** el avance físico leído del texto solo existe en " + n(IND.cobertura_pct.arequipa.avance_reportado, 1) + " % de las obras-mes de Arequipa y el monto contratado en " + n(IND.cobertura_pct.arequipa.log_monto_contratado, 1) + " %; el modelo trata la ausencia como una categoría propia, pero esos indicadores pesan menos de lo que podrían."));
add(vi("**Asociación, no causa:** los patrones y contribuciones indican qué acompaña al atraso, no qué lo provoca; por ejemplo, el monto o el sector no se pueden «corregir»."));
add(vi("**Selección entre modelos:** se probaron tres modelos anidados y se eligió por validación; en Arequipa el elegido no fue el mejor en la prueba. Se reporta sin cambiar la elección."));

// 7. Conclusiones
add(salto(), h1("7. Conclusiones"));
add(p(`**Conclusión 1 (OE1 y OE2).** Es posible reconstruir, con datos abiertos e IA, el enlace entre consultas y respuestas que los datos oficiales no publican. El emparejador eligió la consulta correcta en ${pc(E.modelo_ia)} de los casos de Arequipa, frente a ${pc(E.regla_mas_reciente)} de la mejor regla simple, y con umbral alcanzó ${pc(E.precision_con_umbral)} de precisión.`));
add(p(`**Conclusión 2 (OE3).** El cumplimiento de los plazos de respuesta es bajo y poco trazable. Solo ${n(QA.pct_respondidas_enlazadas, 1)} % de las ${n(QA.consultas_residente)} consultas del residente en Arequipa tiene respuesta en el cuaderno, y ${n(QA.pct_tarde_entre_respondidas, 1)} % de las respondidas llegó fuera del plazo legal.`));
add(p(`**Conclusión 3 (OE4).** Leer el cuaderno y cruzarlo con plazo, dinero e historial permite anticipar el atraso legal. En el país, el modelo de ${NVAR} indicadores obtuvo una PR-AUC de ${n(MN.pr_auc, 3)} frente a una tasa base de ${pc(NA.prevalencia)}, superior con significancia a la regla, a la regresión logística y al modelo solo con el cuaderno. En Arequipa, revisando el 20 % de mayor riesgo se encuentra ${pc(M.precision_top20)} de obras que se atrasan (frente a ${pc(AQ.prevalencia)} al azar), y el sistema marcó con riesgo alto al ${n(ANT.pct_alertadas, 1)} % de las obras que luego se atrasaron, con una mediana de ${n(ANT.dias_anticipacion_mediana, 1)} días de anticipación; la ventaja frente a modelos más simples no es concluyente allí por el tamaño de la muestra. Cada alerta se explica con fórmulas verificables y con el asiento que la respalda.`));
add(p(`**Conclusión 4 (OE5).** El prototipo cumple los requerimientos con costo cero. Muestra para ${n(RES.obras)} obras el riesgo, el responsable y la prueba escrita; la lista carga en ${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms y no publica datos personales.`));

// 8. Trabajo futuro
add(h1("8. Trabajo futuro"));
add(vi("Evaluar el prototipo con supervisores y Órganos de Control Institucional de Arequipa (escala SUS y utilidad percibida), y medir si las obras revisadas destraban sus consultas antes."));
add(vi("Solicitar al OECE la publicación del identificador de asiento para usar el campo ASIENTO_ENLAZADO y validar el emparejador con un enlace oficial."));
add(vi("Usar la ampliación de plazo por demora en la absolución como segundo evento a predecir, que es el efecto legal directo de la demora (RLGCP art. 190.4)."));
add(vi("Crear con dos anotadores un corpus revisado a mano de respuestas sin cita, para medir el emparejador en los casos difíciles."));
add(vi("Automatizar la actualización mensual y extender el análisis a otras regiones."));

// 9. Declaraciones
add(h1("9. Declaraciones"));
add(h2("9.1 Conflicto de intereses"));
add(p("Los autores declaran no tener conflictos de intereses."));
add(h2("9.2 Financiamiento"));
add(p("El estudio no recibió financiamiento externo. Se usaron recursos propios y servicios gratuitos."));
add(h2("9.3 Consideraciones éticas"));
add(p("Se usaron exclusivamente datos abiertos del Estado; los textos publicados se anonimizan; el sistema no emite juicios sobre personas ni empresas y sus resultados son prioridades de revisión, no hallazgos de control."));
add(h2("9.4 Disponibilidad de datos y código"));
add(p("El código, las métricas (carpeta resultados/), los diagramas y el prototipo están en el repositorio público github.com/OwerLopez/caja-negra-obras, bajo licencia MIT. Los datos de origen son públicos en el portal del OECE; su linaje (URL y SHA-256 de cada archivo) se incluye en resultados/linaje_oece.jsonl. El prototipo está publicado en https://owerlopez.github.io/caja-negra-obras/."));

// Referencias
add(salto(), h1("Referencias"));
REF.forEach(([, t], i) => add(new Paragraph({ spacing: { after: 80, line: 260 }, indent: { left: 560, hanging: 560 }, children: [r(`[${i + 1}] `, { size: 19 }), r(t, { size: 19 })] })));

// Anexos
add(salto(), h1("Anexo A. Matriz de consistencia"));
add(...tabla("Matriz de consistencia", ["Problema", "Pregunta / hipótesis", "Objetivo", "Variable", "Indicador", "Método / instrumento", "Resultado"], [
  ["Nadie sabe qué respuesta corresponde a qué consulta", "H1", "OE2", "Consulta correcta", "Exactitud top-1; precisión con umbral", "Respuestas con número borrado; reglas como comparador", `${pc(E.modelo_ia)} frente a ${pc(E.regla_mas_reciente)}`],
  ["No se mide el plazo de respuesta", "Pregunta (parte a)", "OE3", "Plazos de las consultas", "% tarde; % sin respuesta en el cuaderno", "Motor de plazos (RLCE 193, RLGCP 190)", `${n(QA.pct_tarde_entre_respondidas, 1)} % tarde; ${n(QA.pct_respondidas_enlazadas, 1)} % trazable`],
  ["El atraso se detecta tarde", "H2", "OE4", "Atraso legal en 60 días", "PR-AUC; precisión y exhaustividad en el 20 %; anticipación", "Validación temporal; bootstrap por obra", `PR-AUC ${n(M.pr_auc, 3)}; ${pc(M.precision_top20)}; ${n(ANT.dias_anticipacion_mediana)} días`],
  ["El texto y los datos de ejecución no se usan para anticipar", "H3", "OE4", "Ocho grupos de indicadores", "Diferencia pareada de PR-AUC frente al modelo solo cuaderno; ablación", "Bootstrap pareado; reentrenamiento por grupo", `Nacional +${n(PARN["B3 LightGBM solo cuaderno"].diferencia_pr_auc, 3)} (p = ${n(PARN["B3 LightGBM solo cuaderno"].p_unilateral, 3)}); Arequipa ${n(PAR["B3 LightGBM solo cuaderno"].diferencia_pr_auc, 3)} (p = ${n(PAR["B3 LightGBM solo cuaderno"].p_unilateral, 3)})`],
  ["Los datos no llegan al usuario", "Pregunta (parte b)", "OE5", "Prototipo", "Requerimientos cumplidos; tiempo de carga", "Medición automatizada", `${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms; 0 errores`],
], [1.9, 1.2, 0.9, 1.4, 1.7, 1.8, 1.7]));
add(h1("Anexo B. Glosario en palabras simples"));
add(...tabla("Términos usados en el informe", ["Término", "Qué significa"], [
  ["Asiento", "Cada anotación del cuaderno de obra, con número, fecha, autor y texto."],
  ["Consulta / absolución", "Pregunta del residente sobre algo que el expediente no resuelve, y su respuesta oficial."],
  ["Atraso legal", "Cuando lo realmente ejecutado es menor al 80 % de lo programado; obliga a un calendario acelerado."],
  ["Sentence-BERT", "Modelo de lenguaje que convierte cada texto en una lista de números que representa su significado; dos textos parecidos quedan cerca."],
  ["LightGBM", "Algoritmo que aprende reglas de decisión (árboles) a partir de ejemplos del pasado."],
  ["Calibración", "Ajuste para que «10 % de riesgo» signifique que, de verdad, se atrasa 1 de cada 10."],
  ["PR-AUC", "Nota de 0 a 1 de qué tan bien el sistema pone primero a las obras que sí se atrasan; el azar saca lo mismo que la tasa base."],
  ["Bootstrap", "Repetir el cálculo mil veces con muestras de obras sorteadas para saber cuánto puede variar el resultado."],
  ["Validación temporal", "Entrenar con el pasado y probar con meses posteriores, como en la vida real."],
  ["Indicador (característica)", "Un número calculado para cada obra y mes, por ejemplo días sin anotaciones o porcentaje del plazo consumido."],
  ["Logit", "Escala del puntaje del modelo: 0 equivale a 50 % y cada unidad negativa reduce la probabilidad."],
  ["TreeSHAP", "Método que reparte el puntaje de una obra entre sus indicadores, para saber qué subió o bajó el riesgo."],
  ["Ablación", "Reentrenar el modelo quitando un grupo de indicadores para ver cuánto se pierde."],
  ["Corte temporal", "Regla de usar solo datos con fecha menor o igual al mes evaluado, para no «ver el futuro»."],
], [2.4, 7]));
add(h1("Anexo C. Preguntas probables y respuestas"));
const QA_ = [
  ["¿Por qué usaron PR-AUC y no exactitud?", `Porque el atraso es poco frecuente (${pc(AQ.prevalencia)}). Decir siempre «no se atrasa» daría ${pc(1 - AQ.prevalencia)} de exactitud y sería inútil. PR-AUC mide qué tan bien se pone primero a las obras que sí se atrasan.`],
  ["¿Por qué el 20 %?", "Porque representa una capacidad de revisión realista: un equipo puede revisar a fondo 1 de cada 5 obras al mes. Es un punto operativo, no un número mágico; la PR-AUC resume todos los puntos."],
  ["¿Cómo saben que los datos son verificados?", "Son datos abiertos del OECE; cada archivo tiene su URL y su huella SHA-256 registrada. Todo se calcula con scripts públicos que cualquiera puede volver a ejecutar."],
  ["¿Cómo probaron el emparejador si no hay respuestas correctas oficiales?", `Usamos las respuestas que sí citan el número de asiento: esa cita es la respuesta correcta. Borramos el número y le pedimos al sistema que adivine. Se probó en ${n(E.respuestas)} respuestas de Arequipa.`],
  ["¿El modelo hizo trampa viendo el futuro?", "No. Cada mes usa solo asientos anteriores a la fecha de corte; se entrenó hasta septiembre de 2025 y se probó de enero a junio de 2026."],
  ["¿Por qué no entrenaron solo con Arequipa?", `Porque en Arequipa hay pocos atrasos para aprender (${n(PLZ.panel.arequipa.positivos)} obras-mes positivas en todo el periodo). Se aprende del país y se evalúa en Arequipa.`],
  ["¿Qué pasa si una consulta se respondió por carta?", "No aparece en el cuaderno. Por eso el sistema no dice «no respondida», sino «sin respuesta en el cuaderno», y lo declara como limitación."],
  ["¿Por qué no usaron un modelo de lenguaje grande (tipo ChatGPT)?", "Porque la tarea se resuelve con un modelo pequeño, gratuito y local, que no envía datos a terceros y es medible. Un modelo grande sería más caro y más difícil de verificar."],
  ["¿Cómo predice exactamente?", `Suma ${MOD.arboles.final} árboles de decisión sobre ${NVAR} indicadores para obtener un puntaje F(x); lo convierte en probabilidad con p = 1/(1 + e^−(A·F + B)) y lo clasifica con umbrales fijados en validación. TreeSHAP descompone F(x) en la contribución de cada indicador (ecuaciones 3 a 7).`],
  ["¿Qué indicadores usan y por qué esos?", "Ocho grupos que la literatura y la norma asocian a eventos de plazo: actividad del cuaderno, señales formales (ampliaciones previas, suspensiones, penalidades), consultas y plazos, plazo consumido frente a avance, contrato, ejecución financiera, historial de entidad y contratista, y calendario. La ablación muestra cuánto aporta cada uno."],
  ["¿Por qué no eligieron M1 si en Arequipa salió mejor?", "Porque elegir con la prueba sería hacer trampa: el modelo se eligió con la validación, antes de ver la prueba. En Arequipa las diferencias están dentro del error por muestreo, y en el país el modelo elegido es el mejor."],
  ["¿El sistema acusa al supervisor?", "No. Señala qué consultas están vencidas según el cuaderno y quién debía responder según la ley; es una prioridad de revisión con su prueba, no una sanción."],
];
add(...tabla("Preguntas frecuentes en la sustentación", ["Pregunta", "Respuesta breve"], QA_, [3, 6.4]));

add(h1("Anexo D. Catálogo completo de indicadores"));
add(p(`Los ${NVAR} indicadores del predictor, con su fórmula al corte T, su fuente, la razón por la que se incluyen, la cobertura en Arequipa (porcentaje de obras-mes con dato) y su importancia en el modelo final. El catálogo vive en un único archivo (src/caja_negra/indicadores.py) que alimenta el entrenamiento, el prototipo y este informe.`));
for (const [g, nombre] of Object.entries(GR)) {
  add(...tabla(`Indicadores del grupo «${nombre}»`, ["Indicador", "Fórmula (corte T)", "Fuente", "Por qué", "Cobertura AQP", "Importancia"],
    MJ.catalogo.filter((x) => x.grupo === nombre).map((x) => [x.variable, x.formula, x.fuente, x.por_que, `${n(x.cobertura_arequipa, 1)} %`, `${n(x.importancia, 2)} %`]),
    [1.9, 2.7, 1.4, 3.2, 0.9, 0.9]));
}

// ---------- documento ----------
const doc = new Document({
  creator: "Ower Frank López",
  title: "Caja Negra de Obra — Informe GESITI",
  styles: {
    default: { document: { run: { font: FUENTE, size: 21, color: "1F2933" } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: TINTA, font: FUENTE }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: "2B4C9B", font: FUENTE }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: TINTA, font: FUENTE }, paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
    { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
    { reference: "pasos", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [r("Curso: Gestión de Sistemas y Tecnologías de Información · Caja Negra de Obra", { size: 16, color: "4B5A6A" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [r("Página ", { size: 16, color: "4B5A6A" }), new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 16, color: "4B5A6A" }), r(" de ", { size: 16, color: "4B5A6A" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FUENTE, size: 16, color: "4B5A6A" })] })] }) },
    children: C,
  }],
});
const salida = path.join(RAIZ, "informe", "Informe_Caja_Negra_de_Obra.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(salida, b); console.log("ok", salida, nFig, "figuras", nTab, "tablas"); });
