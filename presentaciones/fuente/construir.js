// Construye presentaciones/Caja_Negra_de_Obra_Exposicion.pptx: exposición técnica en cinco bloques.
// Toda cifra se lee de resultados/*.json y web/data/*.json; los diagramas reproducen los flujos del informe.
// Uso: PPTX_SKILL=<carpeta del skill pptx> NODE_PATH=<carpeta con pptxgenjs> node presentaciones/fuente/construir.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), "utf8"));
const P1 = leer("resultados/p01_resumen.json"), EMP = leer("resultados/p02_emparejador.json"), PLZ = leer("resultados/p03_plazos.json");
const COB = leer("resultados/p03b_indicadores.json").cobertura_pct.arequipa, MOD = leer("resultados/p04_modelo.json");
const WEB = leer("resultados/prototipo.json"), MJ = leer("web/data/modelo.json"), META = leer("web/data/meta.json");
const OBRA1 = leer(`web/data/obra/${leer("web/data/obras.json")[0].id}.json`);
const n = (x, d = 0) => { const [e, f] = Number(x).toFixed(d).split("."); const ent = e.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"); return f ? `${ent},${f}` : ent; };
const pc = (x, d = 1) => `${n(100 * x, d)} %`;
const AQ = MOD.resultados.arequipa, NA = MOD.resultados.nacional, M = AQ.modelos["M Caja Negra"], MN = NA.modelos["M Caja Negra"];
const E = EMP.evaluacion.prueba, QA = PLZ.arequipa, ANT = MOD.anticipacion.arequipa, PAR = MOD.particion, NIV = MOD.niveles;
const IG = MOD.importancia_grupo, GR = MJ.grupos, NVAR = MJ.catalogo.length, PARN = NA.comparacion_pareada;

// ---------- tema: azul de plano, tinta de cuaderno y los tres colores de riesgo ----------
const TINTA = "1B2A3A", PIZARRA = "2E4157", PLANO = "2B4C9B", ALTO = "B42318", MEDIO = "9A6410", BAJO = "2F6F4B";
const GRIS = "56677A", NIEBLA = "EEF2F6", BORDE = "D3DAE2", BLANCO = "FFFFFF", HUMO = "C5CFDA", CIELO = "E6ECF8", ROSA = "FBEDEB";
const THEME = { name: "Caja Negra exposición", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: TINTA, lt1: BLANCO, dk2: PIZARRA, lt2: NIEBLA, accent1: PLANO, accent2: ALTO, accent3: BAJO, accent4: MEDIO,
    accent5: "7A8796", accent6: HUMO, hlink: PLANO, folHlink: "5A4B9B" } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "Caja Negra de Obra";
pres.author = "Ower Frank López";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: "PORTADA", background: { color: TINTA },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.5, w: 11.7, h: 1.5, fontSize: 48, bold: true, color: C.background1, valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.2, w: 10.5, h: 3.4, fontSize: 20, color: HUMO, valign: "top", align: "left" }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "CONTENIDO", background: { color: BLANCO }, margin: [0.5, 0.6, 0.6, 0.6],
  slideNumber: { x: 12.4, y: 7.02, w: 0.6, h: 0.3, fontSize: 10, color: GRIS },
  objects: [
    { text: { text: "Caja Negra de Obra", options: { x: 0.6, y: 7.02, w: 6, h: 0.3, fontSize: 10, color: GRIS, isTextBox: true } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.3, w: 12.1, h: 0.85, fontSize: 26, bold: true, color: C.text1, valign: "middle", align: "left" }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "CIERRE", background: { color: TINTA },
  slideNumber: { x: 12.4, y: 7.02, w: 0.6, h: 0.3, fontSize: 10, color: "9AA7B4" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.3, w: 12.1, h: 0.85, fontSize: 26, bold: true, color: C.background1, valign: "middle", align: "left" }, text: "" } },
  ] });

// ---------- piezas ----------
function imagen(slide, archivo, x, y, maxW, maxH, nombre, recorte) {
  const buf = fs.readFileSync(path.join(RAIZ, "informe", "figuras", archivo));
  const w = buf.readUInt32BE(16), h = recorte ?? buf.readUInt32BE(20);
  let W = maxW, H = (maxW * h) / w;
  if (H > maxH) { H = maxH; W = (maxH * w) / h; }
  const o = { data: "image/png;base64," + buf.toString("base64"), x: x + (maxW - W) / 2, y: y + (maxH - H) / 2, w: W, h: H, objectName: nombre, altText: nombre };
  if (recorte) o.sizing = { type: "crop", w: W, h: H, x: 0, y: 0 };
  slide.addImage(o);
  slide.addShape(pres.shapes.RECTANGLE, { x: o.x, y: o.y, w: W, h: H, fill: { type: "none" }, line: { color: BORDE, width: 1 }, objectName: `${nombre}-marco` });
}
const texto = (s, t, o) => s.addText(t, { isTextBox: true, color: TINTA, fontSize: 15, valign: "top", margin: 0, ...o });
const caja = (s, x, y, w, h, nombre, fill = NIEBLA, linea = BORDE) =>
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: linea, width: 1 }, rectRadius: 0.07, objectName: nombre });
function sello(s, x, y, t, color = PLANO, d = 0.46) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color }, objectName: `sello-${t}` });
  texto(s, String(t), { x, y, w: d, h: d, fontSize: d > 0.45 ? 15 : 12, bold: true, color: BLANCO, align: "center", valign: "middle" });
}
function flecha(s, x1, y1, x2, y2, color = GRIS) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width: 1.5, endArrowType: "triangle" }, objectName: "flecha" });
}
function nodo(s, x, y, w, h, titulo, detalle, { fill = NIEBLA, color = TINTA, num, numColor = PLANO, tam = 14 } = {}) {
  caja(s, x, y, w, h, `nodo-${titulo}`, fill);
  const dx = num !== undefined ? 0.55 : 0.15;
  if (num !== undefined) sello(s, x + 0.12, y + 0.12, num, numColor, 0.36);
  texto(s, titulo, { x: x + dx, y: y + 0.1, w: w - dx - 0.12, h: 0.42, fontSize: tam, bold: true, color, valign: "middle" });
  if (detalle) texto(s, detalle, { x: x + 0.15, y: y + 0.55, w: w - 0.3, h: h - 0.62, fontSize: 11.5, color: PIZARRA });
}
function dato(s, x, y, w, h, cifra, etiqueta, color, nombre) {
  caja(s, x, y, w, h, nombre);
  texto(s, cifra, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.85, fontSize: 34, bold: true, color, fontFace: "Cambria", valign: "middle" });
  texto(s, etiqueta, { x: x + 0.2, y: y + 1.02, w: w - 0.4, h: h - 1.12, fontSize: 13, color: GRIS });
}
const cab = (cols, size = 12) => cols.map((t) => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: TINTA }, fontSize: size, valign: "middle" } }));
const fila = (vals, size = 12, o = {}) => vals.map((t, i) => ({ text: String(t), options: { fontSize: size, color: TINTA, valign: "middle",
  bold: i === 0 || o.negrita, fontFace: (o.formula ?? []).includes(i) ? "Cambria Math" : undefined, fill: o.fill ? { color: o.fill } : undefined } }));
const tabla = (s, filas, o) => s.addTable(filas, { border: { type: "solid", color: BORDE, pt: 1 }, margin: [0.04, 0.07, 0.04, 0.07], ...o });
const ejes = { catAxisLabelColor: GRIS, valAxisLabelColor: GRIS, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt",
  dataLabelFontFace: "+mn-lt", catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 11, dataLabelColor: TINTA, titleFontSize: 12, titleColor: GRIS,
  valGridLine: { color: "E3E7EB", size: 1 }, catGridLine: { style: "none" }, showValue: true };
const nueva = (seccion, titulo, notas) => {
  const s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: seccion });
  s.addText(titulo, { placeholder: "title" });
  s.addNotes(notas);
  return s;
};

// =====================================================================================
// Bloque 1 · Contexto y problema (diapositivas 1 a 3)
pres.addSection({ title: "1 · Contexto y problema" });
let s = pres.addSlide({ masterName: "PORTADA", sectionTitle: "1 · Contexto y problema" });
s.addText("Caja Negra de Obra", { placeholder: "title" });
s.addText([
  { text: "Inteligencia artificial sobre el cuaderno de obra digital para auditar consultas y anticipar atrasos en las obras públicas de Arequipa", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Integrantes: Ower Frank López", options: { fontSize: 15, color: BLANCO, breakLine: true } },
  { text: "Gestión de Sistemas y Tecnologías de Información · Escuela Profesional de Ingeniería de Sistemas · UNSA", options: { fontSize: 13, color: "9AA7B4", breakLine: true } },
  { text: "Docente: Dr. R. Fabrizio Calienes Rodríguez · noviembre de 2026", options: { fontSize: 13, color: "9AA7B4" } },
], { placeholder: "body" });
s.addNotes("Presentamos Caja Negra de Obra. Investigamos por qué las obras públicas de Arequipa se atrasan, encontramos una fuente de datos que nadie procesa (el cuaderno de obra digital) y construimos un sistema que la lee para avisar a tiempo qué obras revisar, siempre con la prueba escrita. Completar en la portada los nombres de todos los integrantes.");

s = nueva("1 · Contexto y problema", "Origen: obras paralizadas y un cuaderno que nadie lee a tiempo",
  "El origen es oficial. Según la Contraloría, al 31 de marzo de 2026 Arequipa tenía 126 obras paralizadas por 8 383 millones de soles, tercera en el país por costo. Las causas que declaran las entidades son el incumplimiento de contrato, la falta de liquidez, el expediente técnico y las controversias. Desde junio de 2024 cada obra por contrata escribe su día a día en el cuaderno de obra digital, que el OECE publica como datos abiertos. Ahí está la información, pero nadie la procesa.");
dato(s, 0.6, 1.4, 2.95, 2.1, "126", "obras paralizadas en Arequipa al 31-03-2026", ALTO, "dato-paralizadas");
dato(s, 3.75, 1.4, 2.95, 2.1, "8 383", "millones de soles de costo actualizado: 3.er departamento del país", ALTO, "dato-costo");
s.addChart(pres.charts.BAR, [{ name: "Obras paralizadas", labels: ["Incumplimiento de contrato", "Falta de liquidez", "Deficiencia del expediente técnico", "Controversias y arbitraje"],
  values: [27.6, 24.2, 9.1, 9.1] }], { x: 7.0, y: 1.3, w: 5.75, h: 2.45, barDir: "bar", chartColors: [ALTO], valAxisMinVal: 0, valAxisMaxVal: 32,
  dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"', dataLabelPosition: "outEnd", showLegend: false, showTitle: true,
  title: "Causas declaradas de paralización en el país", ...ejes, objectName: "grafico-causas" });
caja(s, 0.6, 3.95, 12.1, 1.95, "cuaderno", CIELO, "B9C8E8");
texto(s, "La fuente que motivó el proyecto", { x: 0.85, y: 4.08, w: 11.6, h: 0.4, fontSize: 17, bold: true, color: PLANO, fontFace: "Cambria" });
texto(s, [
  { text: "El cuaderno de obra digital registra cada día lo que pasa en la obra: avances, consultas, órdenes, suspensiones. Es oficial, fechado y obligatorio, y el OECE lo publica como datos abiertos desde junio de 2024.", options: { breakLine: true } },
  { text: `Solo en Arequipa hay ${n(P1.arequipa.asientos)} anotaciones en ${n(P1.arequipa.cuadernos)} cuadernos: unas ${n(P1.arequipa.asientos / P1.arequipa.cuadernos)} por obra. Ninguna entidad puede leerlas todas cada mes.`, options: { bold: true } },
], { x: 0.85, y: 4.52, w: 11.6, h: 1.3, fontSize: 15, color: PIZARRA, paraSpaceAfter: 6 });
texto(s, "Fuentes: Contraloría, Informe N.° 001-2026-CG/SESNC, Tablas 3 y 9; OECE, datos abiertos del cuaderno de obra digital (jun-2024 a ago-2026).", { x: 0.6, y: 6.15, w: 12.1, h: 0.4, fontSize: 11, color: GRIS });

s = nueva("1 · Contexto y problema", "Problema: las señales se leen cuando el atraso ya ocurrió",
  "Este es nuestro árbol de problemas, el mismo del informe. A la izquierda las causas: consultas que el expediente no resolvió, plazos legales de 5 o 21 días para responder, nadie mide esos plazos porque los datos no unen cada respuesta con su consulta, y no hay personal para leer cientos de asientos. El efecto es que el atraso se detecta tarde. Abajo, lo que medimos nosotros: solo el 37 % de las consultas tiene una respuesta trazable en el cuaderno y el 19 % de las respuestas llegó fuera de plazo. Con esto pasamos a la investigación.");
const causas = ["El residente anota consultas que el expediente técnico no resolvió", "La respuesta tiene plazo legal: 5 días, o 21 si interviene el proyectista",
  "Nadie mide esos plazos: los datos abiertos no unen respuesta y consulta", "Leer cientos de asientos por obra no es posible con el personal disponible"];
const efectos = ["Atraso legal: avance real menor al 80 % de lo programado", "Ampliaciones de plazo y mayores costos", "Obras paralizadas: 126 en Arequipa", "El control llega cuando ya no hay remedio"];
texto(s, "Causas", { x: 0.6, y: 1.3, w: 3.9, h: 0.35, fontSize: 14, bold: true, color: PLANO });
texto(s, "Efectos", { x: 8.8, y: 1.3, w: 3.9, h: 0.35, fontSize: 14, bold: true, color: ALTO });
causas.forEach((t, i) => { caja(s, 0.6, 1.7 + i * 0.95, 3.9, 0.8, `causa-${i}`, CIELO, "B9C8E8"); texto(s, t, { x: 0.75, y: 1.75 + i * 0.95, w: 3.6, h: 0.7, fontSize: 12.5, valign: "middle" }); flecha(s, 4.5, 2.1 + i * 0.95, 4.9, 3.5); });
efectos.forEach((t, i) => { caja(s, 8.8, 1.7 + i * 0.95, 3.9, 0.8, `efecto-${i}`, ROSA, "EBC4BE"); texto(s, t, { x: 8.95, y: 1.75 + i * 0.95, w: 3.6, h: 0.7, fontSize: 12.5, valign: "middle" }); flecha(s, 8.4, 3.5, 8.8, 2.1 + i * 0.95); });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.9, y: 2.55, w: 3.5, h: 1.9, fill: { color: TINTA }, line: { color: TINTA }, rectRadius: 0.07, objectName: "problema" });
texto(s, [{ text: "Problema central", options: { bold: true, color: HUMO, fontSize: 12, breakLine: true } },
  { text: "Las señales de que una obra se traba quedan escritas en el cuaderno, pero se leen tarde.", options: { color: BLANCO, fontSize: 15, bold: true } }],
{ x: 5.1, y: 2.7, w: 3.1, h: 1.65, valign: "middle", align: "center" });
[[pc(QA.pct_respondidas_enlazadas / 100, 0), `de ${n(QA.consultas_residente)} consultas del residente en Arequipa tiene respuesta trazable en el cuaderno`, MEDIO],
  [pc(QA.pct_tarde_entre_respondidas / 100, 0), "de las respuestas registradas llegó fuera del plazo legal (medido por nosotros)", ALTO]]
  .forEach(([cifra, t, c], i) => {
    const x = 0.6 + i * 6.15;
    caja(s, x, 5.65, 5.95, 1.15, `medido-${i}`);
    texto(s, cifra, { x: x + 0.2, y: 5.7, w: 1.6, h: 1.05, fontSize: 34, bold: true, color: c, fontFace: "Cambria", valign: "middle" });
    texto(s, t, { x: x + 1.85, y: 5.7, w: 3.95, h: 1.05, fontSize: 13, color: GRIS, valign: "middle" });
  });

// =====================================================================================
// Bloque 2 · Investigación, propuesta, factores y datos (4 a 7)
pres.addSection({ title: "2 · Investigación y datos" });
s = nueva("2 · Investigación y datos", "Investigación: qué existe y qué faltaba",
  "Revisamos Google Scholar, arXiv, repositorios peruanos (ALICIA, RENATI, UNSA, PUCP), LACCEI, CIB W78 y fuentes oficiales, de 2018 a 2026. Hay evaluaciones de INFOBRAS, estudios de causas con encuestas o revisión manual, modelos de aprendizaje automático con datos estructurados y experiencias de lectura de bitácoras con IA en otros idiomas. Ninguno lee el cuaderno de obra peruano ni mide si las consultas se responden en plazo. Esa es la brecha que cubrimos.");
tabla(s, [cab(["Antecedente", "Qué hizo", "Datos y método", "Qué le falta para nuestro problema"]),
  fila(["Pierri y Lafuente (BID, 2020)", "Efecto de INFOBRAS y el control ciudadano", "INFOBRAS y MEF; regresión discontinua", "Evalúa el pasado; no anticipa"]),
  fila(["Velásquez Jara (LACCEI, 2023)", "Causas de 1 879 obras paralizadas", "Análisis cualitativo", "Sin datos de ejecución ni modelo"]),
  fila(["Julca-Varas et al. (ASCE, 2025)", "Riesgos de atraso en 318 obras de saneamiento", "Revisión manual de órdenes de cambio", "Manual, no escala"]),
  fila(["Vilchez (2026)", "Riesgo de paralización y sobrecosto", "LightGBM y grafo sobre INFOBRAS, SSI y SEACE", "No usa el cuaderno de obra"]),
  fila(["Bitácoras con IA (Corea 2023; CIB W78 2024)", "Texto de reportes de obra", "BERT y modelos de lenguaje", "Otro idioma; sin plazos legales"]),
  fila(["Contraloría (TDR, 2022)", "Modelo predictivo de obras riesgosas", "Planificado", "Sin resultados públicos"]),
], { x: 0.6, y: 1.35, w: 12.1, colW: [3.0, 3.0, 3.2, 2.9], rowH: 0.5, objectName: "tabla-antecedentes" });
caja(s, 0.6, 5.2, 12.1, 1.55, "brecha", CIELO, "B9C8E8");
texto(s, [{ text: "Brecha identificada: ", options: { bold: true, color: PLANO } },
  { text: "nadie lee con IA el cuaderno de obra digital peruano ni mide si las consultas se responden dentro del plazo legal. Además, el campo oficial que debería unir cada respuesta con su consulta apunta a un identificador que no se publica: el dato «días hasta la respuesta» no existe en ninguna fuente pública." }],
{ x: 0.85, y: 5.35, w: 11.6, h: 1.3, fontSize: 15, valign: "middle" });

s = nueva("2 · Investigación y datos", "Propuesta: un inspector virtual que lee el cuaderno y avisa",
  "La propuesta responde tres preguntas que cualquier supervisor entiende: ¿se va a atrasar?, ¿quién la está trabando? y ¿qué está pasando? Para eso construimos cuatro componentes en cadena. El alcance es acotado: obras por contrata de Arequipa con cuaderno digital, y la etiqueta es el atraso legal, no la paralización.");
[["¿Se va a atrasar?", "Probabilidad de atraso legal en 60 días, con su nivel y sus razones", ALTO],
  ["¿Quién la está trabando?", "Cada consulta con su plazo legal, su estado y quién debe responder", MEDIO],
  ["¿Qué está pasando?", "Plazo frente a avance, dinero, historial y hechos formales, con el asiento como prueba", PLANO]]
  .forEach(([t, d, c], i) => { caja(s, 0.6 + i * 4.1, 1.4, 3.9, 1.65, `pregunta-${i}`); sello(s, 0.78 + i * 4.1, 1.55, i + 1, c, 0.42);
    texto(s, t, { x: 1.35 + i * 4.1, y: 1.52, w: 3.05, h: 0.5, fontSize: 16, bold: true, valign: "middle", fontFace: "Cambria" });
    texto(s, d, { x: 0.8 + i * 4.1, y: 2.12, w: 3.5, h: 0.85, fontSize: 13, color: PIZARRA }); });
const comp = [["Emparejador", "Une cada respuesta con su consulta (reglas + IA)"], ["Motor de plazos", "Aplica 5 o 21 días y da el veredicto"],
  [`${NVAR} indicadores`, "8 grupos, solo datos con fecha ≤ T"], ["Predictor", "Probabilidad calibrada y razones por obra"]];
comp.forEach(([t, d], i) => { nodo(s, 0.6 + i * 3.1, 3.4, 2.75, 1.25, t, d, { num: i + 1, fill: i % 3 === 0 ? CIELO : NIEBLA }); if (i < 3) flecha(s, 3.36 + i * 3.1, 4.02, 3.69 + i * 3.1, 4.02); });
caja(s, 0.6, 4.95, 5.95, 1.8, "alcance-si", "EAF4EE", "BFDCCB");
texto(s, [{ text: "Dentro del alcance", options: { bold: true, color: BAJO, breakLine: true } },
  { text: "Obras por contrata de Arequipa con cuaderno digital (jun-2024 a ago-2026)", options: { bullet: true, breakLine: true } },
  { text: "Aprendizaje con todo el país; evaluación en meses futuros", options: { bullet: true, breakLine: true } },
  { text: "Web pública con prioridad de revisión y prueba escrita", options: { bullet: true } }], { x: 0.8, y: 5.05, w: 5.6, h: 1.65, fontSize: 13, paraSpaceAfter: 3 });
caja(s, 6.75, 4.95, 5.95, 1.8, "alcance-no", ROSA, "EBC4BE");
texto(s, [{ text: "Fuera del alcance", options: { bold: true, color: ALTO, breakLine: true } },
  { text: "Predecir la paralización (se predice el atraso legal, evento anterior)", options: { bullet: true, breakLine: true } },
  { text: "Obras por administración directa (no usan el cuaderno digital)", options: { bullet: true, breakLine: true } },
  { text: "Acusar o sancionar: es una prioridad de revisión", options: { bullet: true } }], { x: 6.95, y: 5.05, w: 5.6, h: 1.65, fontSize: 13, paraSpaceAfter: 3 });

s = nueva("2 · Investigación y datos", `Factores y variables: ${NVAR} indicadores en 8 grupos por obra y mes`,
  "Seleccionamos factores con cuatro criterios: que la norma o la literatura los asocie a eventos de plazo, que existan en una fuente oficial, que se puedan calcular solo con datos anteriores al mes evaluado y que tengan cobertura suficiente. Tres grupos salen del cuaderno y cinco de fuentes externas. Todos forman una fila por obra y mes, que es la entrada del modelo; la variable que se predice es el atraso legal en los 60 días siguientes. El peso es cuánto los usa el modelo.");
const grupos = [
  ["actividad", "Asientos 30/90 días, días sin anotar, % del supervisor", "Cuaderno"], ["senales", "Ampliaciones previas, suspensiones, penalidades, órdenes", "Cuaderno"],
  ["consultas", "Vencidas, en plazo, respondidas tarde, persistencia", "Cuaderno + IA"], ["plazo", "Plazo consumido frente a avance físico, días restantes", "INFOBRAS + texto"],
  ["contrato", "Monto contratado y viable, consorcio, nivel, sector", "SEACE, MEF"], ["financiera", "Devengado SIAF / viable, meses sin pago", "MEF SIAF"],
  ["historial", "Atrasos previos de la entidad y del contratista", "Cuadernos previos"], ["calendario", "Temporada de lluvias, cierre fiscal, mes", "Fecha de corte"]];
grupos.forEach(([g, d, f], i) => {
  const col = i % 2, filaG = Math.floor(i / 2), x = 0.6 + col * 3.75, y = 1.35 + filaG * 1.3;
  caja(s, x, y, 3.55, 1.15, `grupo-${g}`, i < 3 ? CIELO : NIEBLA, i < 3 ? "B9C8E8" : BORDE);
  texto(s, GR[g], { x: x + 0.15, y: y + 0.08, w: 2.6, h: 0.36, fontSize: 13, bold: true, valign: "middle" });
  texto(s, `${n(IG[g], 1)} %`, { x: x + 2.65, y: y + 0.08, w: 0.75, h: 0.36, fontSize: 12, bold: true, color: PLANO, align: "right", valign: "middle" });
  texto(s, d, { x: x + 0.15, y: y + 0.45, w: 3.25, h: 0.45, fontSize: 11, color: PIZARRA });
  texto(s, f, { x: x + 0.15, y: y + 0.85, w: 3.25, h: 0.25, fontSize: 10, color: GRIS, italic: true });
});
flecha(s, 8.15, 3.95, 8.55, 3.95);
caja(s, 8.55, 1.35, 4.15, 5.4, "criterios", TINTA, TINTA);
texto(s, [
  { text: "Fila obra-mes", options: { bold: true, color: BLANCO, fontSize: 16, fontFace: "Cambria", breakLine: true } },
  { text: "x(i, T) = (x₁, …, x₅₃)  →  y(i, T)", options: { color: "C9D7FF", fontFace: "Cambria Math", fontSize: 15, breakLine: true } },
  { text: "y = 1 si en (T, T + 60 días] se anota «valorización < 80 %» o «calendario acelerado»", options: { color: HUMO, fontSize: 12, breakLine: true } },
  { text: " ", options: { breakLine: true, fontSize: 6 } },
  { text: "Criterios de selección", options: { bold: true, color: BLANCO, fontSize: 14, breakLine: true } },
  { text: "Asociado a eventos de plazo por la norma o la literatura", options: { bullet: true, color: HUMO, breakLine: true } },
  { text: "Disponible en una fuente oficial y abierta", options: { bullet: true, color: HUMO, breakLine: true } },
  { text: "Calculable solo con datos de fecha ≤ T (sin ver el futuro)", options: { bullet: true, color: HUMO, breakLine: true } },
  { text: "Con cobertura suficiente; la ausencia se trata como un valor propio", options: { bullet: true, color: HUMO, breakLine: true } },
  { text: " ", options: { breakLine: true, fontSize: 6 } },
  { text: "Porcentaje: peso de cada grupo en el modelo (ganancia de los árboles).", options: { color: "9AA7B4", fontSize: 11 } },
], { x: 8.75, y: 1.5, w: 3.8, h: 5.15, fontSize: 13, paraSpaceAfter: 4 });

s = nueva("2 · Investigación y datos", "Datos: fuentes oficiales, cobertura y cómo verificamos su calidad",
  "Todos los datos son abiertos y oficiales. El cuaderno de obra digital del OECE es la fuente central: 2,7 millones de asientos del país entre junio de 2024 y agosto de 2026. Se complementa con MEF, INFOBRAS y SEACE. La calidad se controla con la huella SHA-256 de cada archivo, el corte temporal y la cobertura de cada indicador. La limitación principal es que algunos datos externos tienen poca cobertura: el avance físico leído del texto solo existe en el 7 % de las obras-mes de Arequipa. Con esto termina el bloque de datos y pasamos a la metodología.");
tabla(s, [cab(["Institución y fuente", "Qué se toma", "Cobertura", "Validación"]),
  fila(["OECE · cuaderno de obra digital", `${n(P1.nacional.asientos)} asientos y ${n(P1.nacional.cuadernos)} cuadernos del país; ${n(P1.arequipa.asientos)} y ${n(P1.arequipa.cuadernos)} en Arequipa`, "Perú, jun-2024 a ago-2026", "URL y SHA-256 por archivo"]),
  fila(["MEF · SIAF y Banco de Inversiones", "Devengado mensual, monto viable, problemas reportados", `${n(COB.devengado_sobre_viable, 0)} % de obras-mes de Arequipa`, "Solo meses ≤ T"]),
  fila(["INFOBRAS", "Plazo y fechas originales del contrato", `${n(COB.plazo_consumido, 0)} %`, "Datos fijos; nunca el avance de la foto actual"]),
  fila(["SEACE / CONOSCE", "Monto contratado", `${n(COB.log_monto_contratado, 0)} %`, "Cruce por obra"]),
  fila(["Contraloría", "Contexto de obras paralizadas", "Corte 31-03-2026", "PDF oficial, tabla por tabla"]),
], { x: 0.6, y: 1.35, w: 12.1, colW: [3.0, 4.2, 2.4, 2.5], rowH: 0.55, objectName: "tabla-fuentes" });
[["Linaje", "Cada archivo descargado queda registrado con su URL y su huella SHA-256 (resultados/linaje_oece.jsonl)."],
  ["Corte temporal", "Cada indicador del mes T usa solo datos con fecha ≤ T; lo posterior solo sirve para la etiqueta."],
  ["Limitaciones", `Avance físico leído del texto: ${n(COB.avance_reportado, 1)} % de cobertura. Respuestas por carta no se ven. Solo obras por contrata.`]]
  .forEach(([t, d], i) => { caja(s, 0.6 + i * 4.1, 4.95, 3.9, 1.8, `calidad-${i}`, i === 2 ? ROSA : NIEBLA, i === 2 ? "EBC4BE" : BORDE);
    texto(s, t, { x: 0.8 + i * 4.1, y: 5.05, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: i === 2 ? ALTO : PLANO, fontFace: "Cambria" });
    texto(s, d, { x: 0.8 + i * 4.1, y: 5.5, w: 3.5, h: 1.15, fontSize: 13, color: PIZARRA }); });

// =====================================================================================
// Bloque 3 · Metodología, procesamiento y medidas (8 a 11)
pres.addSection({ title: "3 · Metodología y métricas" });
s = nueva("3 · Metodología y métricas", "Metodología: diseño de un artefacto y evaluación fuera de tiempo",
  "El enfoque es cuantitativo y aplicado: construimos un artefacto y medimos su desempeño con datos reales. Seguimos las seis fases del informe: diagnóstico, revisión, diseño, construcción, evaluación y discusión. La regla clave está en la flecha de regreso: los ajustes se hacen solo con validación, nunca con la prueba. La evaluación es fuera de tiempo: el modelo aprende con meses pasados y se prueba en meses que nunca vio, como ocurriría en la realidad.");
const fases = [["Diagnóstico", "Problema y evidencia (Contraloría, OECE, norma)"], ["Revisión", "Estado del arte y brecha"], ["Diseño", "Requerimientos, arquitectura y datos"],
  ["Construcción", "Emparejador, motor de plazos, indicadores, predictor y web"], ["Evaluación", "Prueba temporal, comparadores y bootstrap"], ["Discusión", "Límites, ética y trabajo futuro"]];
fases.forEach(([t, d], i) => { nodo(s, 0.6 + i * 2.05, 1.45, 1.85, 1.6, t, d, { num: i + 1, numColor: i === 4 ? ALTO : PLANO, tam: 14 }); if (i < 5) flecha(s, 2.46 + i * 2.05, 2.25, 2.64 + i * 2.05, 2.25); });
s.addShape(pres.shapes.LINE, { x: 7.65, y: 3.3, w: 2.05, h: 0, line: { color: ALTO, width: 1.5, dashType: "dash", beginArrowType: "triangle" }, objectName: "retorno" });
texto(s, "Ajustes solo con validación, nunca con la prueba", { x: 6.65, y: 3.4, w: 4.1, h: 0.35, fontSize: 12, color: ALTO, bold: true, align: "center" });
[["Enfoque", "Cuantitativo y aplicado: se construye un artefacto y se mide con datos oficiales completos (no una muestra)."],
  ["Unidad de análisis", `La obra en un mes: ${n(PLZ.panel.filas)} obras-mes de ${n(PLZ.panel.obras)} obras del país; ${n(PLZ.panel.arequipa.filas_observables)} observables en Arequipa.`],
  ["Hipótesis", "H1: la IA enlaza mejor que la regla más simple.\nH2: el predictor ordena mejor que el azar y que una regla.\nH3: los 8 grupos mejoran frente al modelo solo con el cuaderno."]]
  .forEach(([t, d], i) => { caja(s, 0.6 + i * 4.1, 4.05, 3.9, 2.4, `metodo-${i}`);
    texto(s, t, { x: 0.8 + i * 4.1, y: 4.17, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: PLANO, fontFace: "Cambria" });
    texto(s, d, { x: 0.8 + i * 4.1, y: 4.62, w: 3.5, h: 1.75, fontSize: 13, color: PIZARRA, paraSpaceAfter: 4 }); });

s = nueva("3 · Metodología y métricas", "Procesamiento: pipeline reproducible, un archivo por paso",
  "Este es el flujo de datos del informe. Cada script lee los archivos del paso anterior y deja los suyos. Preparar depura asientos y cuadernos; emparejar une consultas y respuestas; plazos y panel aplica la ley y arma la fila obra-mes; indicadores agrega las fuentes externas con corte temporal; modelo entrena y mide; exportar publica para la web. Abajo, los controles de calidad que aplicamos en el camino.");
const pasosP = [["p01 · Preparar", "Asientos y cuadernos del OECE", "asientos.parquet\ncuadernos.parquet"], ["p02 · Emparejar", "Reglas + IA", "pares.parquet"],
  ["p03 · Plazos y panel", "Veredicto y fila obra-mes", "consultas_auditadas\npanel.parquet"], ["p03b · Indicadores", "SIAF, INFOBRAS, SEACE, historial", `panel_ampliado\n(${NVAR} indicadores)`],
  ["p04 · Modelo", "Entrenar, calibrar, medir", "modelo.txt\ncalibrador"], ["p05 · Exportar", "Puerta de calidad", "JSON + meta.json"]];
pasosP.forEach(([t, d, sal], i) => {
  const x = 0.6 + i * 2.05;
  nodo(s, x, 1.45, 1.85, 1.45, t, d, { fill: i === 1 || i === 4 ? CIELO : NIEBLA, tam: 13 });
  caja(s, x + 0.1, 3.15, 1.65, 0.75, `salida-${i}`, BLANCO);
  texto(s, sal, { x: x + 0.15, y: 3.18, w: 1.55, h: 0.7, fontSize: 10, color: GRIS, align: "center", valign: "middle", fontFace: "Consolas" });
  flecha(s, x + 0.92, 2.9, x + 0.92, 3.15);
  if (i < 5) flecha(s, x + 1.86, 2.15, x + 2.04, 2.15);
});
texto(s, "Archivo de salida de cada paso", { x: 0.6, y: 3.95, w: 12.1, h: 0.3, fontSize: 11, color: GRIS, italic: true });
[["Orden determinista", "Toda consulta a datos fija su orden: el texto y su representación numérica nunca se desalinean."],
  ["Sin fuga temporal", "Las señales del mes T usan solo asientos y respuestas conocidas hasta T."],
  ["Anonimización", "Nombres, DNI, colegiaturas, correos y teléfonos se enmascaran antes de publicar."],
  ["Puerta de calidad", "p05 no publica si una probabilidad sale de [0, 1], si un nivel no cuadra o si falta una ficha."]]
  .forEach(([t, d], i) => { caja(s, 0.6 + i * 3.05, 4.45, 2.85, 1.95, `control-${i}`);
    texto(s, t, { x: 0.78 + i * 3.05, y: 4.57, w: 2.5, h: 0.4, fontSize: 14, bold: true, color: PLANO, fontFace: "Cambria" });
    texto(s, d, { x: 0.78 + i * 3.05, y: 5.02, w: 2.5, h: 1.3, fontSize: 12.5, color: PIZARRA }); });

s = nueva("3 · Metodología y métricas", "Medidas del problema y de los datos, antes del modelo",
  "Antes del modelo medimos el problema y la calidad de los datos. La cobertura dice qué tan completo está cada indicador. Los días de respuesta y el veredicto aplican la ley. Los porcentajes de respuestas trazables y tardías describen el problema. Y la exactitud del emparejador dice si podemos confiar en el enlace consulta–respuesta: la IA acierta 67 % frente a 52 % de la mejor regla simple, y con umbral de confianza llega a 91 % de precisión.");
tabla(s, [cab(["Medida", "Fórmula", "Unidad", "Para qué sirve", "Valor medido (Arequipa)"]),
  fila(["Cobertura de un indicador", "obras-mes con dato ÷ obras-mes × 100", "%", "Calidad de los datos", `Plazo consumido ${n(COB.plazo_consumido, 1)} %; avance ${n(COB.avance_reportado, 1)} %`], 12, { formula: [1] }),
  fila(["Días hasta la respuesta", "d = min(f_respuesta, T) − f_consulta", "días calendario", "Medir la demora", `Mediana ${n(QA.dias_respuesta.mediana)}; percentil 90: ${n(QA.dias_respuesta.p90)}`], 12, { formula: [1] }),
  fila(["Veredicto de plazo", "vencida si d > 5 (supervisor) o d > 21 (con proyectista)", "categoría", "Aplicar RLCE 193 y RLGCP 190", "A tiempo · Tarde · En plazo · Sin respuesta"], 12, { formula: [1] }),
  fila(["Respuestas trazables", "consultas con respuesta enlazada ÷ consultas × 100", "%", "Trazabilidad del cuaderno", `${n(QA.pct_respondidas_enlazadas, 1)} % de ${n(QA.consultas_residente)}`], 12, { formula: [1] }),
  fila(["Respuestas tardías", "respondidas tarde ÷ respondidas × 100", "%", "Cumplimiento del plazo", `${n(QA.pct_tarde_entre_respondidas, 1)} %`], 12, { formula: [1] }),
  fila(["Exactitud del emparejador", "aciertos ÷ respuestas evaluadas", "%", "¿Elige la consulta correcta?", `${pc(E.modelo_ia)} (IC 95 %: ${pc(E.modelo_ia_ic95[0])}–${pc(E.modelo_ia_ic95[1])}) frente a ${pc(E.regla_mas_reciente)}`], 12, { formula: [1] }),
  fila(["Precisión con umbral", "aciertos ÷ enlaces con confianza ≥ 0,85", "%", "Evitar enlaces dudosos", `${pc(E.precision_con_umbral)} con cobertura de ${pc(E.cobertura_con_umbral)}`], 12, { formula: [1] }),
], { x: 0.6, y: 1.35, w: 12.1, colW: [2.3, 3.5, 1.2, 2.3, 2.8], rowH: 0.62, objectName: "tabla-medidas" });
texto(s, `El emparejador se evaluó con ${n(E.respuestas)} respuestas de Arequipa que citan su consulta: se borró el número citado y el sistema tuvo que adivinarla (aprendió con ${n(EMP.conjunto_oro.entrenamiento)} respuestas del resto del país).`,
  { x: 0.6, y: 6.35, w: 12.1, h: 0.45, fontSize: 12, color: GRIS });

s = nueva("3 · Metodología y métricas", "Métricas del modelo: fórmula, unidad, interpretación y criterio",
  "Estas son las métricas del predictor, todas medidas en meses que el modelo no vio. La principal es la PR-AUC porque el atraso es raro: solo el 7 % de las obras-mes de Arequipa en la prueba. Con un evento tan raro, la exactitud engaña: decir siempre que no habrá atraso acertaría 93 % y no serviría. Las métricas al 20 % responden la pregunta del supervisor: si reviso una de cada cinco obras, cuántas tenían el problema. Brier e intervalos nos dicen si la probabilidad es creíble y si una diferencia es real. Con esto cierro el bloque y paso al modelo.");
tabla(s, [cab(["Métrica", "Fórmula", "Unidad", "Interpretación", "Criterio"]),
  fila(["PR-AUC (principal)", "AP = Σₙ (Rₙ − Rₙ₋₁) · Pₙ", "0 a 1", "Qué tan bien pone primero a las obras que se atrasan", `Azar = tasa base (${pc(AQ.prevalencia)} en Arequipa)`], 12, { formula: [1] }),
  fila(["Precisión@20 %", "TP₂₀ / N₂₀", "%", "De las obras marcadas, cuántas se atrasaron", "Mayor que la tasa base"], 12, { formula: [1] }),
  fila(["Exhaustividad@20 %", "TP₂₀ / TP", "%", "Qué parte de los atrasos encuentra ese 20 %", "Mayor que 20 %"], 12, { formula: [1] }),
  fila(["Lift@20 %", "Precisión@20 / π", "veces", "Cuántas veces mejor que revisar al azar", "Mayor que 1"], 12, { formula: [1] }),
  fila(["ROC-AUC", "P(p_atraso > p_sin atraso)", "0 a 1", "Probabilidad de ordenar bien un par", "0,5 = azar"], 12, { formula: [1] }),
  fila(["Brier", "(1/N) · Σ (pᵢ − yᵢ)²", "0 a 1", "Error de la probabilidad", "Menor que el de la tasa base"], 12, { formula: [1] }),
  fila(["IC 95 % y valor p", "bootstrap por obra, 1 000 remuestreos", "—", "Incertidumbre; ¿la ventaja es real?", "p < 0,05 concluyente"], 12, { formula: [1] }),
  fila(["Anticipación", "f_atraso − primera alerta alta (≤ 120 días)", "días", "Tiempo para actuar antes del atraso", "Mediana y cuartiles"], 12, { formula: [1] }),
], { x: 0.6, y: 1.35, w: 12.1, colW: [2.2, 3.2, 1.0, 3.4, 2.3], rowH: 0.53, objectName: "tabla-metricas" });
texto(s, `No usamos la exactitud global: con ${pc(AQ.prevalencia)} de atrasos, decir siempre «no se atrasa» acertaría ${pc(1 - AQ.prevalencia)} y no serviría para nada. TP: atrasos; N: obras-mes; π: tasa base.`,
  { x: 0.6, y: 6.4, w: 12.1, h: 0.45, fontSize: 12, color: ALTO, bold: true });

// =====================================================================================
// Bloque 4 · Machine Learning, evaluación y arquitectura (12 a 14)
pres.addSection({ title: "4 · Modelo, evaluación y arquitectura" });
s = nueva("4 · Modelo, evaluación y arquitectura", "Machine Learning: de los indicadores a una probabilidad explicada",
  `El predictor es un LightGBM: una suma de ${MOD.arboles.final} árboles de decisión sobre los ${NVAR} indicadores, cuyo número fijó la parada temprana en validación. El puntaje se convierte en probabilidad con la calibración de Platt, y los umbrales de validación dan el nivel. TreeSHAP reparte el puntaje entre los indicadores para explicar cada alerta. El emparejador es otro modelo: Sentence-BERT compara el significado de los textos y un LightGBM de pares elige la consulta más probable.`);
const cadena = [["Indicadores", `x = (x₁ … x₅₃)\nde la obra en T`], ["Puntaje", `F(x) = Σₖ fₖ(x)\nK = ${MOD.arboles.final} árboles`], ["Probabilidad", `p = 1 / (1 + e^−(A·F + B))\nA = ${n(MJ.platt.A, 3)}; B = ${n(MJ.platt.B, 3)}`],
  ["Nivel", `Alto si p ≥ ${n(100 * NIV.umbral_alto, 2)} %\nMedio si p ≥ ${n(100 * NIV.umbral_medio, 2)} %`], ["Razones", "F(x) = φ₀ + Σⱼ φⱼ\nTreeSHAP"]];
cadena.forEach(([t, f], i) => {
  const x = 0.6 + i * 2.45;
  caja(s, x, 1.45, 2.2, 1.85, `cadena-${i}`, i === 4 ? CIELO : NIEBLA);
  sello(s, x + 0.12, 1.57, i + 1, i === 3 ? ALTO : PLANO, 0.36);
  texto(s, t, { x: x + 0.55, y: 1.55, w: 1.55, h: 0.4, fontSize: 14, bold: true, valign: "middle" });
  texto(s, f, { x: x + 0.12, y: 2.08, w: 1.98, h: 1.15, fontSize: 12, fontFace: "Cambria Math", color: TINTA, align: "center", valign: "middle" });
  if (i < 4) flecha(s, x + 2.21, 2.37, x + 2.44, 2.37);
});
tabla(s, [cab(["Componente", "Enfoque", "Entrada", "Salida"]),
  fila(["Predictor de atraso", "LightGBM (gradient boosting) + Platt + TreeSHAP", `${NVAR} indicadores por obra-mes`, "Probabilidad, nivel y 8 razones"]),
  fila(["Emparejador", "Sentence-BERT multilingüe + LightGBM de pares", "Texto de respuesta y consultas candidatas", "Consulta enlazada y confianza"]),
], { x: 0.6, y: 3.55, w: 7.6, colW: [1.8, 2.4, 1.8, 1.6], rowH: 0.5, objectName: "tabla-modelos" });
const h = MJ.hiperparametros;
caja(s, 8.5, 3.55, 4.2, 3.25, "configuracion");
texto(s, [{ text: "Configuración del modelo final", options: { bold: true, color: PLANO, fontFace: "Cambria", fontSize: 15, breakLine: true } },
  { text: `${MOD.arboles.final} árboles de ${h.num_leaves} hojas`, options: { bullet: true, breakLine: true } },
  { text: `Tasa de aprendizaje ${n(h.learning_rate, 2)}`, options: { bullet: true, breakLine: true } },
  { text: `Al menos ${h.min_data_in_leaf} obras-mes por hoja`, options: { bullet: true, breakLine: true } },
  { text: `Regularización L2 = ${h.lambda_l2}`, options: { bullet: true, breakLine: true } },
  { text: `Submuestreo: ${pc(h.bagging_fraction, 0)} de filas y ${pc(h.feature_fraction, 0)} de indicadores`, options: { bullet: true, breakLine: true } },
  { text: "Aprende minimizando la log-loss; semilla fija", options: { bullet: true } }], { x: 8.7, y: 3.72, w: 3.85, h: 2.95, fontSize: 13, color: PIZARRA, paraSpaceAfter: 3 });
caja(s, 0.6, 5.35, 7.6, 1.45, "emparejador", CIELO, "B9C8E8");
texto(s, [{ text: "Cómo decide el emparejador", options: { bold: true, color: PLANO, fontFace: "Cambria", fontSize: 15, breakLine: true } },
  { text: "1. Si la respuesta cita el número de asiento o de consulta, el enlace es por regla.", options: { breakLine: true } },
  { text: "2. Si no, compara el significado con la similitud coseno: cos(u, v) = u · v / (‖u‖ ‖v‖).", options: { breakLine: true } },
  { text: `3. Solo acepta el enlace con confianza ≥ ${n(E.umbral, 2)}; si no, queda «sin respuesta en el cuaderno».` }], { x: 0.8, y: 5.42, w: 7.25, h: 1.32, fontSize: 12.5, color: PIZARRA, paraSpaceAfter: 2 });

s = nueva("4 · Modelo, evaluación y arquitectura", "Evaluación: entrenar en el pasado y medir una sola vez en el futuro",
  `La partición es temporal y estricta: entrenamiento hasta septiembre de 2025, validación de octubre a diciembre para detener, calibrar y elegir el modelo, y prueba de enero a junio de 2026. Comparamos con cinco alternativas. En el país, con ${NA.positivos} atrasos, el modelo de 8 grupos supera con significancia a la regla, a la regresión logística y al modelo solo con el cuaderno. En Arequipa, con ${AQ.positivos} atrasos, solo la ventaja frente al azar es concluyente y el modelo con cuaderno y consultas sale algo mejor: lo decimos tal cual, porque elegimos en validación y no mirando la prueba.`);
const bloques = [["Entrenamiento", PAR.entrenamiento, "Aprender los árboles", PLANO], ["Validación", PAR.validacion, "Detener, calibrar, umbrales, elegir modelo", MEDIO], ["Prueba", PAR.prueba, "Medición final, una sola vez", ALTO]];
const mesesDe = (b) => { const d = new Date(b.desde), hh = new Date(b.hasta); return (hh.getFullYear() - d.getFullYear()) * 12 + hh.getMonth() - d.getMonth() + 1; };
const totalMeses = bloques.reduce((a, [, b]) => a + mesesDe(b), 0);
let xx = 0.6;
bloques.forEach(([t, b, uso, c]) => {
  const w = Math.max(2.6, (8.0 * mesesDe(b)) / totalMeses);
  s.addShape(pres.shapes.RECTANGLE, { x: xx, y: 1.45, w: w - 0.06, h: 0.5, fill: { color: c }, line: { color: c }, objectName: `bloque-${t}` });
  texto(s, t, { x: xx + 0.1, y: 1.45, w: w - 0.2, h: 0.5, fontSize: 13, bold: true, color: BLANCO, valign: "middle" });
  texto(s, `${b.desde.slice(0, 7)} a ${b.hasta.slice(0, 7)} · ${n(b.filas)} obras-mes · ${n(b.positivos)} atrasos\n${uso}`, { x: xx, y: 2.0, w: w - 0.1, h: 0.75, fontSize: 11, color: PIZARRA });
  xx += w;
});
const NOM = { "B0 Tasa base": "Azar (tasa base)", "B1 Regla: consultas vencidas": "Regla: consultas vencidas", "B2 Regresión logística": "Regresión logística",
  "B3 LightGBM solo cuaderno": "Árboles solo cuaderno", "M1 LightGBM cuaderno + consultas": "Árboles cuaderno + consultas", "M Caja Negra": "Caja Negra (8 grupos)" };
const claves = Object.keys(AQ.modelos);
s.addChart(pres.charts.BAR, [
  { name: "Arequipa", labels: claves.map((k) => NOM[k]), values: claves.map((k) => Math.round(1000 * AQ.modelos[k].pr_auc) / 1000) },
  { name: "Todo el país", labels: claves.map((k) => NOM[k]), values: claves.map((k) => Math.round(1000 * NA.modelos[k].pr_auc) / 1000) },
], { x: 0.6, y: 2.9, w: 6.6, h: 3.9, barDir: "bar", barGrouping: "clustered", chartColors: ["9AA7B4", PLANO], valAxisMinVal: 0, valAxisMaxVal: 0.25,
  dataLabelFormatCode: "0.000", valAxisLabelFormatCode: "0.00", dataLabelPosition: "outEnd", showLegend: true, legendPos: "b", legendFontSize: 11, showTitle: true,
  title: "PR-AUC en la prueba (enero–junio de 2026)", ...ejes, objectName: "grafico-prauc" });
tabla(s, [cab(["Resultado", "Arequipa", "País"]),
  fila(["Tasa base (azar)", pc(AQ.prevalencia), pc(NA.prevalencia)]),
  fila(["PR-AUC Caja Negra", n(M.pr_auc, 3), n(MN.pr_auc, 3)]),
  fila(["Precisión@20 %", pc(M.precision_top20), pc(MN.precision_top20)]),
  fila(["Lift@20 %", `${n(M.lift_top20, 2)}×`, `${n(MN.lift_top20, 2)}×`]),
  fila(["Brier (tasa base)", `${n(M.brier, 4)} (${n(AQ.modelos["B0 Tasa base"].brier, 4)})`, `${n(MN.brier, 4)} (${n(NA.modelos["B0 Tasa base"].brier, 4)})`]),
  fila(["p frente a solo cuaderno", n(AQ.comparacion_pareada["B3 LightGBM solo cuaderno"].p_unilateral, 3), n(PARN["B3 LightGBM solo cuaderno"].p_unilateral, 3)]),
  fila(["Anticipación mediana", `${n(ANT.dias_anticipacion_mediana, 1)} días (${n(ANT.pct_alertadas, 1)} % alertadas)`, `${n(MOD.anticipacion.nacional.dias_anticipacion_mediana, 0)} días`]),
], { x: 7.45, y: 2.9, w: 5.25, colW: [2.15, 1.65, 1.45], rowH: 0.42, objectName: "tabla-resultados" });
texto(s, `Arequipa: ${AQ.positivos} atrasos en la prueba, por eso sus intervalos son amplios.`, { x: 7.45, y: 6.4, w: 5.25, h: 0.4, fontSize: 11, color: ALTO, bold: true });

s = nueva("4 · Modelo, evaluación y arquitectura", "Arquitectura: cinco capas conectadas por archivos con contrato",
  "La arquitectura integra datos, ML, backend y frontend. El backend no es un servidor: es el pipeline en Python que corre una vez por corte mensual. No hay base de datos en línea: los datos se guardan en Parquet y se consultan con DuckDB durante el procesamiento. La comunicación entre el ML y la web es un contrato: archivos JSON con una versión de esquema y la huella del modelo que los generó. El frontend solo lee esos archivos y muestra el resultado. Con esto termina mi bloque y pasamos al flujo completo y la demostración.");
const capas = [["Fuentes", "OECE · MEF · INFOBRAS · SEACE · Contraloría", "datos abiertos"], ["Ingesta y almacenamiento", "Depuración, Parquet consultado con DuckDB, linaje SHA-256", "base de datos de archivos"],
  ["Inteligencia (ML)", `Emparejador · motor de plazos · ${NVAR} indicadores · predictor`, "Sentence-BERT · LightGBM"], ["Publicación (contrato)", "JSON por obra + meta.json: esquema, corte y huella del modelo", "puerta de calidad"],
  ["Presentación (frontend)", "Panorama · Ficha de obra · Cómo predice · recorrido guiado", "JS modular · GitHub Pages"]];
capas.forEach(([t, d, tec], i) => {
  const y = 1.35 + i * 1.08;
  caja(s, 0.6, y, 7.9, 0.9, `capa-${i}`, i === 2 ? CIELO : NIEBLA, i === 2 ? "B9C8E8" : BORDE);
  sello(s, 0.78, y + 0.22, i + 1, i === 2 ? PLANO : PIZARRA);
  texto(s, t, { x: 1.4, y: y + 0.08, w: 2.5, h: 0.74, fontSize: 14, bold: true, valign: "middle" });
  texto(s, d, { x: 3.9, y: y + 0.08, w: 2.85, h: 0.74, fontSize: 12, valign: "middle", color: PIZARRA });
  texto(s, tec, { x: 6.8, y: y + 0.08, w: 1.6, h: 0.74, fontSize: 11, valign: "middle", color: PLANO, bold: true, align: "right" });
  if (i < 4) flecha(s, 4.55, y + 0.9, 4.55, y + 1.08);
});
tabla(s, [cab(["Pieza", "Responsabilidad"]),
  fila(["Frontend", "Mostrar prioridades, razones y la prueba escrita; verificar el esquema de los datos"]),
  fila(["Backend (pipeline)", "Leer fuentes, aplicar la ley, calcular indicadores, ejecutar el ML y publicar"]),
  fila(["Modelo de ML", "Enlazar consultas y estimar el riesgo con explicación"]),
  fila(["Base de datos", "Archivos Parquet versionados y consultados con DuckDB; sin servidor en línea"]),
  fila(["Comunicación", "Archivos con contrato: meta.json fija el esquema y la huella del modelo"]),
], { x: 8.75, y: 1.35, w: 3.95, colW: [1.25, 2.7], rowH: 0.6, objectName: "tabla-responsabilidades" });
texto(s, `Corte publicado: ${META.corte}. Modelo ${META.modelo.huella}: ${META.modelo.arboles} árboles y ${META.modelo.indicadores} indicadores.`, { x: 8.75, y: 6.45, w: 3.95, h: 0.4, fontSize: 10.5, color: GRIS });

// =====================================================================================
// Bloque 5 · Flujo integral, demostración y conclusiones (15 a 17)
pres.addSection({ title: "5 · Flujo integral, demostración y cierre" });
s = nueva("5 · Flujo integral, demostración y cierre", "Flujo integral: del asiento escrito a la decisión del supervisor",
  "Este es el recorrido completo, de punta a punta. El OECE publica el cuaderno cada mes. El pipeline lo descarga y lo cruza con las otras fuentes. El emparejador y el motor de plazos auditan las consultas. Los 53 indicadores alimentan el predictor, que da probabilidad, nivel y razones. Todo se publica como archivos con contrato, la web los muestra, y el supervisor decide qué revisar con el asiento en la mano. Ahora lo vemos funcionando.");
const flujo = [["Publicación OECE", "Asientos del mes (datos abiertos)"], ["Ingesta", "Depurar, cruzar con MEF, INFOBRAS, SEACE"], ["Auditoría", "Enlazar consultas y aplicar plazos"],
  ["Indicadores", `${NVAR} por obra al cierre T`], ["Predicción", "Probabilidad, nivel y razones"], ["Publicación", "JSON + meta.json validados"], ["Web", "Panorama, ficha y prueba escrita"]];
flujo.forEach(([t, d], i) => {
  const x = 0.6 + i * 1.75;
  nodo(s, x, 1.55, 1.58, 1.85, t, d, { num: i + 1, numColor: i === 4 ? ALTO : PLANO, fill: i === 2 || i === 4 ? CIELO : NIEBLA, tam: 12.5 });
  if (i < 6) flecha(s, x + 1.59, 2.48, x + 1.74, 2.48);
});
caja(s, 0.6, 3.75, 12.1, 0.95, "decision", TINTA, TINTA);
texto(s, "Decisión: el supervisor, la entidad o el Órgano de Control revisa primero las obras de riesgo alto y pide la absolución de las consultas vencidas, con el número de asiento en la mano.",
  { x: 0.85, y: 3.8, w: 11.6, h: 0.85, fontSize: 15, color: BLANCO, bold: true, valign: "middle" });
[["Frecuencia", "Una vez por corte mensual, cuando el OECE publica los datos."], ["Tiempo de respuesta", `La lista aparece en ${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms (mediana de 5 cargas).`],
  ["Trazabilidad", "Cada cifra en pantalla se puede rastrear hasta el modelo, el código y el asiento original."]]
  .forEach(([t, d], i) => { caja(s, 0.6 + i * 4.1, 5.0, 3.9, 1.45, `flujo-${i}`);
    texto(s, t, { x: 0.8 + i * 4.1, y: 5.1, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: PLANO, fontFace: "Cambria" });
    texto(s, d, { x: 0.8 + i * 4.1, y: 5.55, w: 3.5, h: 0.85, fontSize: 13, color: PIZARRA }); });

s = nueva("5 · Flujo integral, demostración y cierre", "Demostración: el sistema real con el corte del 31-08-2026",
  `Hacemos el recorrido en el sitio publicado, owerlopez.github.io/caja-negra-obras. Uno: la entrada son los datos abiertos del corte del 31 de agosto. Dos: el pipeline los procesó en 53 indicadores por obra. Tres: el modelo asigna a la obra de mayor riesgo ${pc(OBRA1.riesgo.probabilidad)} y explica por qué. Cuatro: el panorama ordena las ${META.obras} obras y muestra cuántas tienen consultas vencidas. Cinco: en la ficha se abre una consulta vencida y aparece el asiento original como prueba. Si alguien no conoce el tema, el botón Recorrido guiado explica cada parte de la pantalla.`);
imagen(s, "c01_panorama.png", 0.6, 1.3, 4.05, 2.95, "captura-panorama");
imagen(s, "c02_ficha.png", 4.75, 1.3, 4.05, 2.95, "captura-ficha");
imagen(s, "c04_consultas.png", 8.9, 1.3, 3.8, 2.95, "captura-consultas", 1500);
texto(s, "Panorama: obras ordenadas por riesgo", { x: 0.6, y: 4.32, w: 4.05, h: 0.3, fontSize: 11, color: GRIS, align: "center" });
texto(s, "Ficha: probabilidad, razones y evolución", { x: 4.75, y: 4.32, w: 4.05, h: 0.3, fontSize: 11, color: GRIS, align: "center" });
texto(s, "Consulta vencida con su asiento", { x: 8.9, y: 4.32, w: 3.8, h: 0.3, fontSize: 11, color: GRIS, align: "center" });
const demo = [["Entrada", `Datos abiertos del corte ${META.corte}`], ["Procesamiento", `Pipeline: ${NVAR} indicadores por obra`], ["Modelo ML", `Probabilidad ${pc(OBRA1.riesgo.probabilidad)} y sus razones`],
  ["Resultado", `${META.obras} obras ordenadas por riesgo`], ["Visualización", "Ficha con el asiento como prueba"]];
demo.forEach(([t, d], i) => {
  const x = 0.6 + i * 2.45;
  nodo(s, x, 4.75, 2.25, 1.2, t, d, { num: i + 1, numColor: i === 2 ? ALTO : PLANO, fill: i === 2 ? CIELO : NIEBLA, tam: 13.5 });
  if (i < 4) flecha(s, x + 2.26, 5.35, x + 2.44, 5.35);
});
texto(s, "Sitio publicado: owerlopez.github.io/caja-negra-obras · Recorrido guiado y globos «?» para quien no conoce el tema",
  { x: 0.6, y: 6.25, w: 12.1, h: 0.4, fontSize: 13, color: PLANO, bold: true });

s = pres.addSlide({ masterName: "CIERRE", sectionTitle: "5 · Flujo integral, demostración y cierre" });
s.addText("Conclusiones: qué está implementado, validado y planificado", { placeholder: "title" });
s.addNotes("Cerramos separando lo que está hecho de lo que falta. Implementado: el pipeline completo, los cuatro componentes de inteligencia y la web publicada con contrato de datos y pruebas. Validado: el emparejador con 67 % de acierto, el predictor fuera de tiempo con mejora significativa en el país, y la web con 114 pruebas y cero violaciones de accesibilidad. Planificado: la prueba con supervisores reales, pedir al OECE el identificador de asiento y predecir también la ampliación de plazo. Aporte: con datos abiertos y buena ingeniería, la caja negra de cada obra se puede leer a tiempo. Gracias; quedamos atentos a sus preguntas.");
const cols = [
  ["Implementado", BAJO, ["Pipeline reproducible p01–p05", "Emparejador, motor de plazos, 53 indicadores y predictor", "Web publicada con contrato de datos, recorrido guiado y glosario", `${WEB.pruebas.passed} pruebas automáticas en integración continua`]],
  ["Validado", PLANO, [`Emparejador: ${pc(E.modelo_ia)} frente a ${pc(E.regla_mas_reciente)} de la mejor regla`, `País: PR-AUC ${n(MN.pr_auc, 3)} frente a ${pc(NA.prevalencia)}, significativo frente a modelos simples`,
    `Arequipa: ${pc(M.precision_top20)} frente a ${pc(AQ.prevalencia)} al azar; no concluyente frente a modelos simples`, `Aviso con ${n(ANT.dias_anticipacion_mediana, 1)} días de anticipación mediana`]],
  ["Planificado", MEDIO, ["Prueba de uso (SUS) con supervisores y Órganos de Control", "Pedir al OECE el identificador de asiento para validar los enlaces", "Predecir también la ampliación de plazo", "Actualización mensual automática y otras regiones"]],
];
cols.forEach(([t, c, items], i) => {
  const x = 0.6 + i * 4.1;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 3.9, h: 3.6, fill: { color: "243649" }, line: { color: "35495F", width: 1 }, rectRadius: 0.07, objectName: `cierre-${t}` });
  sello(s, x + 0.2, 1.55, i + 1, c, 0.42);
  texto(s, t, { x: x + 0.75, y: 1.55, w: 3.0, h: 0.42, fontSize: 17, bold: true, color: BLANCO, valign: "middle", fontFace: "Cambria" });
  texto(s, items.map((it, j) => ({ text: it, options: { bullet: true, breakLine: j < items.length - 1 } })), { x: x + 0.2, y: 2.15, w: 3.5, h: 2.75, fontSize: 13, color: HUMO, paraSpaceAfter: 6 });
});
texto(s, [{ text: "Aporte: ", options: { bold: true, color: BLANCO } },
  { text: "con datos abiertos, una metodología honesta y una arquitectura simple, el cuaderno de obra (la caja negra de cada obra) se puede leer a tiempo: qué obras revisar, por qué y con qué prueba.", options: { color: HUMO } }],
{ x: 0.6, y: 5.35, w: 12.1, h: 1.0, fontSize: 16, valign: "middle" });

const salida = path.join(RAIZ, "presentaciones", "Caja_Negra_de_Obra_Exposicion.pptx");
pres.writeFile({ fileName: salida }).then(async () => {
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(salida, THEME);
  console.log("ok", salida);
});
