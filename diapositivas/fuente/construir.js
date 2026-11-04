// Construye diapositivas/Caja_Negra_de_Obra.pptx: cómo pensamos y construimos el sistema, con cifras leídas de los JSON.
// Uso: PPTX_SKILL=<carpeta del skill pptx> NODE_PATH=<carpeta con pptxgenjs> node diapositivas/fuente/construir.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), "utf8"));
const P1 = leer("resultados/p01_resumen.json"), EMP = leer("resultados/p02_emparejador.json");
const PLZ = leer("resultados/p03_plazos.json"), MOD = leer("resultados/p04_modelo.json"), PAT = leer("resultados/p03c_patrones.json");
const WEB = leer("resultados/prototipo.json"), MJ = leer("web/data/modelo.json"), META = leer("web/data/meta.json");
const OBRA1 = leer(`web/data/obra/${leer("web/data/obras.json")[0].id}.json`);
const n = (x, d = 0) => { const [e, f] = Number(x).toFixed(d).split("."); const ent = e.replace(/\B(?=(\d{3})+(?!\d))/g, " "); return f ? `${ent},${f}` : ent; };
const pc = (x, d = 1) => `${n(100 * x, d)} %`;
const AQ = MOD.resultados.arequipa, NA = MOD.resultados.nacional, M = AQ.modelos["M Caja Negra"], MN = NA.modelos["M Caja Negra"];
const E = EMP.evaluacion.prueba, QA = PLZ.arequipa, ANT = MOD.anticipacion.arequipa;
const IG = MOD.importancia_grupo, AB = MOD.ablacion.por_grupo, GR = MJ.grupos, NVAR = MJ.catalogo.length, PARN = NA.comparacion_pareada;

// ---------- tema: el azul pizarra del cuaderno, rojo de alerta, ámbar de plazo ----------
const TINTA = "1C2A39", PIZARRA = "26384D", SELLO = "2B4C9B", ALTO = "B42318", MEDIO = "9A6410", BAJO = "2F6F4B";
const GRIS = "4B5A6A", NIEBLA = "EEF1F4", BORDE = "D5DBE1", BLANCO = "FFFFFF", HUMO = "C9D1D9";
const THEME = { name: "Caja Negra", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: TINTA, lt1: BLANCO, dk2: PIZARRA, lt2: NIEBLA, accent1: SELLO, accent2: ALTO, accent3: BAJO, accent4: MEDIO,
    accent5: "7A8796", accent6: HUMO, hlink: SELLO, folHlink: "5A4B9B" } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13,33 x 7,5 in
pres.title = "Caja Negra de Obra";
pres.author = "Ower Frank López";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: "PORTADA", background: { color: TINTA },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.7, w: 11.7, h: 1.6, fontSize: 44, bold: true, color: C.background1, valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.5, w: 11.0, h: 2.8, fontSize: 20, color: HUMO, valign: "top" }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "SECCION", background: { color: TINTA },
  slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: "9AA7B4" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 11.7, h: 1.4, fontSize: 40, bold: true, color: C.background1, valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.6, w: 11.0, h: 3.0, fontSize: 20, color: HUMO, valign: "top" }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "CONTENIDO", background: { color: BLANCO }, margin: [0.5, 0.6, 0.6, 0.6],
  slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: GRIS },
  objects: [
    { text: { text: "Caja Negra de Obra · cómo lo construimos", options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: GRIS, isTextBox: true } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.3, w: 12.1, h: 0.9, fontSize: 30, bold: true, color: C.text1, valign: "middle", align: "left" }, text: "" } },
  ] });

// ---------- piezas reutilizables ----------
function imagen(slide, archivo, x, y, maxW, maxH, nombre) {
  const buf = fs.readFileSync(path.join(RAIZ, "informe", "figuras", archivo));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  let W = maxW, H = (maxW * h) / w;
  if (H > maxH) { H = maxH; W = (maxH * w) / h; }
  slide.addImage({ data: "image/png;base64," + buf.toString("base64"), x: x + (maxW - W) / 2, y: y + (maxH - H) / 2, w: W, h: H, objectName: nombre, altText: nombre });
}
const texto = (slide, t, o) => slide.addText(t, { isTextBox: true, color: TINTA, fontSize: 16, valign: "top", margin: 0, ...o });
const caja = (slide, x, y, w, h, nombre, fill = NIEBLA) =>
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: BORDE, width: 1 }, rectRadius: 0.08, objectName: nombre });
// Motivo visual: el número de paso dentro de un círculo, como el sello de un asiento.
function sello(slide, x, y, t, color = SELLO, d = 0.5) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color }, objectName: `sello-${t}` });
  texto(slide, String(t), { x, y, w: d, h: d, fontSize: d > 0.45 ? 16 : 13, bold: true, color: BLANCO, align: "center", valign: "middle" });
}
function tarjeta(slide, x, y, w, h, titulo, cuerpo, color, nombre, num) {
  caja(slide, x, y, w, h, nombre);
  sello(slide, x + 0.25, y + 0.25, num ?? "", color, 0.42);
  texto(slide, titulo, { x: x + 0.82, y: y + 0.22, w: w - 1.0, h: 0.5, fontSize: 17, bold: true, valign: "middle", fontFace: "Cambria" });
  texto(slide, cuerpo, { x: x + 0.25, y: y + 0.88, w: w - 0.5, h: h - 1.05, fontSize: 14, color: PIZARRA, paraSpaceAfter: 4 });
}
function dato(slide, x, y, w, h, cifra, etiqueta, color, nombre) {
  caja(slide, x, y, w, h, nombre);
  texto(slide, cifra, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: 0.95, fontSize: 38, bold: true, color, fontFace: "Cambria", valign: "middle" });
  texto(slide, etiqueta, { x: x + 0.25, y: y + 1.2, w: w - 0.5, h: h - 1.35, fontSize: 14, color: GRIS });
}
function flecha(slide, x1, y1, x2, y2, color = GRIS) {
  slide.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width: 1.75, endArrowType: "triangle" }, objectName: "flecha" });
}
const cabecera = (cols, size = 13) => cols.map((t) => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: TINTA }, fontSize: size, valign: "middle" } }));
const filaT = (vals, size = 13, negrita = [0]) => vals.map((t, i) => ({ text: String(t), options: { fontSize: size, color: TINTA, bold: negrita.includes(i), valign: "middle" } }));
const tabla = (slide, filas, o) => slide.addTable(filas, { border: { type: "solid", color: BORDE, pt: 1 }, margin: [0.05, 0.08, 0.05, 0.08], ...o });
const ejes = { catAxisLabelColor: GRIS, valAxisLabelColor: GRIS, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt",
  dataLabelFontFace: "+mn-lt", catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, dataLabelFontSize: 12, dataLabelColor: TINTA, titleFontSize: 13, titleColor: GRIS,
  valGridLine: { color: "E3E7EB", size: 1 }, catGridLine: { style: "none" }, showLegend: false, showValue: true };
const seccion = (titulo, bajada, nombre, nota) => {
  pres.addSection({ title: nombre });
  const s = pres.addSlide({ masterName: "SECCION", sectionTitle: nombre });
  s.addText(titulo, { placeholder: "title" });
  s.addText(bajada, { placeholder: "body" });
  s.addNotes(nota);
  return s;
};

// =====================================================================================
// 1 · Portada
pres.addSection({ title: "Inicio" });
let s = pres.addSlide({ masterName: "PORTADA", sectionTitle: "Inicio" });
s.addText("Caja Negra de Obra", { placeholder: "title" });
s.addText([
  { text: "Cómo diseñamos y construimos un sistema que lee el cuaderno de obra digital para auditar consultas y anticipar atrasos en las obras públicas de Arequipa", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Gestión de Sistemas y Tecnologías de Información · Escuela de Ingeniería de Sistemas · UNSA · noviembre 2026", options: { fontSize: 14, color: "9AA7B4" } },
], { placeholder: "body" });
s.addNotes("Hoy no venimos a mostrar una página: venimos a explicar cómo pensamos el sistema como equipo de ingeniería, qué decisiones tomamos, por qué, y cómo verificamos que funciona. La demo va al final y es corta.");

// 2 · El problema en una frase
s = pres.addSlide({ masterName: "SECCION", sectionTitle: "Inicio" });
s.addText("El problema en una frase", { placeholder: "title" });
s.addText([
  { text: "Las señales de que una obra se está trabando quedan escritas en el cuaderno de obra, pero se leen tarde: cuando el atraso ya ocurrió.", options: { italic: true, color: BLANCO, fontSize: 24, breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Cuando un avión cae se lee su caja negra. En una obra pública la caja negra es el cuaderno de obra: nosotros lo leemos mientras la obra sigue viva.", options: { fontSize: 18 } },
], { placeholder: "body" });
s.addNotes("La idea central y la metáfora. No pretendemos resolver todas las causas del atraso; atacamos una pieza concreta y medible: las consultas del residente y los plazos legales para responderlas, más las señales que anuncian un atraso.");

// 3 · Evidencia
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Inicio" });
s.addText("Por qué vale la pena: el problema existe y se puede medir", { placeholder: "title" });
dato(s, 0.6, 1.45, 2.9, 2.35, "126", "obras paralizadas en Arequipa al 31-03-2026 (Contraloría, Tabla 3)", ALTO, "dato-paralizadas");
dato(s, 3.7, 1.45, 2.9, 2.35, "8 383", "millones de soles de costo actualizado: 3.er departamento del país", ALTO, "dato-costo");
dato(s, 6.8, 1.45, 2.9, 2.35, pc(QA.pct_respondidas_enlazadas / 100, 0), `de ${n(QA.consultas_residente)} consultas del residente tiene respuesta en el cuaderno`, MEDIO, "dato-trazables");
dato(s, 9.9, 1.45, 2.8, 2.35, pc(QA.pct_tarde_entre_respondidas / 100, 0), "de las respuestas registradas llegó fuera del plazo legal", MEDIO, "dato-tarde");
texto(s, [
  { text: "Por qué es un problema de sistemas de información: ", options: { bold: true } },
  { text: `en Arequipa hay ${n(P1.arequipa.asientos)} asientos en ${n(P1.arequipa.cuadernos)} cuadernos. Nadie puede leerlos cada mes, y los datos abiertos no dicen qué respuesta contesta qué consulta. El dato existe, pero no se convierte en información.` },
], { x: 0.6, y: 4.15, w: 12.1, h: 1.3, fontSize: 18 });
texto(s, "Fuentes: Contraloría, Informe N.° 001-2026-CG/SESNC (corte 31-03-2026); cálculo propio sobre datos abiertos del OECE, junio 2024 a agosto 2026.",
  { x: 0.6, y: 6.35, w: 12.1, h: 0.4, fontSize: 11, color: GRIS });
s.addNotes("Dos cifras oficiales y dos medidas por nosotros. La Contraloría dice que el problema es grande; nuestras mediciones muestran que una parte se origina en información que ya existe pero nadie procesa.");

// 4 · Árbol de problemas
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Inicio" });
s.addText("Causas y efectos que guían el diseño", { placeholder: "title" });
imagen(s, "d01_arbol_problema.png", 0.6, 1.3, 12.1, 5.5, "arbol-problemas");
s.addNotes("Cada causa de la izquierda se convirtió en un componente: consultas sin resolver, emparejador; plazos legales, motor de plazos; nadie mide, indicadores y predictor; falta de personal, priorización automática.");

// =====================================================================================
seccion("Cómo lo pensamos como equipo", "Del problema a las decisiones: proceso de trabajo, requerimientos y arquitectura", "Diseño",
  "Esta sección explica cómo trabajamos antes de escribir código: el proceso, qué debe cumplir el sistema y por qué la arquitectura es la que es.");

// 6 · Proceso de trabajo
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Diseño" });
s.addText("Nuestro proceso y las reglas que no se negocian", { placeholder: "title" });
const pasos = [
  ["Entender", "Árbol de problemas, norma (RLCE y RLGCP) y cifras oficiales"],
  ["Elegir datos", "Fuentes abiertas, oficiales y fechadas; linaje SHA-256"],
  ["Diseñar", "Requerimientos, arquitectura y decisiones registradas"],
  ["Construir", "Un componente a la vez, cada uno con su métrica"],
  ["Medir", "Prueba temporal, comparadores e intervalos"],
  ["Publicar", "Web estática, informe y código abierto"],
];
pasos.forEach(([t, d], i) => {
  const x = 0.6 + i * 2.05;
  caja(s, x, 1.45, 1.85, 2.65, `paso-${i + 1}`);
  sello(s, x + 0.68, 1.62, i + 1, i === 4 ? ALTO : SELLO);
  texto(s, t, { x: x + 0.12, y: 2.27, w: 1.61, h: 0.45, fontSize: 16, bold: true, align: "center", fontFace: "Cambria" });
  texto(s, d, { x: x + 0.12, y: 2.78, w: 1.61, h: 1.2, fontSize: 12, color: PIZARRA, align: "center" });
  if (i < pasos.length - 1) flecha(s, x + 1.86, 2.78, x + 2.04, 2.78);
});
const reglas = [
  ["Cero datos inventados", "Toda cifra sale de un JSON generado por un script versionado."],
  ["Sin ver el futuro", "Cada indicador del mes T usa solo información con fecha ≤ T."],
  ["Decidir con validación", "Umbrales, calibración y modelo se eligen antes de mirar la prueba."],
  ["Explicar cada alerta", "Probabilidad, razones y el asiento original como prueba."],
];
reglas.forEach(([t, d], i) => {
  const x = 0.6 + i * 3.05;
  caja(s, x, 4.45, 2.85, 2.25, `regla-${i + 1}`, "FBEDEB");
  texto(s, t, { x: x + 0.22, y: 4.6, w: 2.45, h: 0.5, fontSize: 16, bold: true, color: ALTO, fontFace: "Cambria" });
  texto(s, d, { x: x + 0.22, y: 5.15, w: 2.45, h: 1.4, fontSize: 14, color: PIZARRA });
});
s.addNotes("Así trabajamos como grupo. Seis pasos que se repiten por componente, siguiendo la investigación basada en diseño, y cuatro reglas que no se negocian: no inventar datos, no mirar el futuro, decidir con validación y nunca dar una alerta sin su prueba.");

// 7 · Requerimientos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Diseño" });
s.addText("Qué debe cumplir: tres preguntas y cinco atributos de calidad", { placeholder: "title" });
[["¿Se va a atrasar?", "Probabilidad de atraso legal a 60 días, su nivel, su evolución y las razones.", ALTO],
  ["¿Quién la está trabando?", "Cada consulta con su plazo legal (5 o 21 días), su estado y el responsable.", MEDIO],
  ["¿Qué está pasando?", "Plazo frente a avance, dinero, historial y hechos formales del cuaderno.", SELLO]]
  .forEach(([t, d, c], i) => tarjeta(s, 0.6, 1.45 + i * 1.78, 5.6, 1.6, t, d, c, `rf-${i + 1}`, `R${i + 1}`));
tabla(s, [cabecera(["Atributo", "Requisito", "Cómo se cumple (medido)"]),
  filaT(["Privacidad", "Ningún dato personal publicado", "Anonimización + prueba automática"]),
  filaT(["Trazabilidad", "Saber qué modelo y datos generaron cada cifra", "meta.json: esquema, huella del modelo, commit"]),
  filaT(["Rendimiento", "Lista visible en menos de 2 s", `${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms (mediana de 5 cargas)`]),
  filaT(["Accesibilidad", "WCAG 2 AA, teclado y móvil", "axe-core: 0 violaciones en las 3 vistas"]),
  filaT(["Costo", "Operar sin licencias ni servidores", "Datos abiertos + GitHub Pages"]),
], { x: 6.5, y: 1.45, w: 6.2, colW: [1.45, 2.25, 2.5], rowH: 0.62, objectName: "tabla-rnf" });
s.addNotes("Los requerimientos funcionales son tres preguntas que cualquier supervisor entiende. Los no funcionales se definieron con un número y una forma de medirlo; la columna derecha es lo medido, no lo prometido.");

// 8 · Decisiones de arquitectura
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Diseño" });
s.addText("Decisiones de arquitectura y lo que aceptamos a cambio", { placeholder: "title" });
tabla(s, [cabecera(["Decisión", "Alternativa descartada", "Por qué", "Costo aceptado"]),
  filaT(["Proceso por lotes mensual + web estática", "API y base de datos en línea", "El OECE publica cada mes; costo cero y casi sin superficie de ataque", "No hay consultas en tiempo real"]),
  filaT(["Cuaderno de obra como fuente central", "Solo INFOBRAS", "Es diario, oficial, fechado y obligatorio", "No cubre administración directa"]),
  filaT(["LightGBM + TreeSHAP", "Red neuronal profunda", "Datos tabulares; explicable por obra; corre en CPU", "Techo de exactitud posible"]),
  filaT(["Sentence-BERT local", "Modelo de lenguaje externo", "Gratis, medible y no envía datos a terceros", "Menor comprensión del texto"]),
  filaT(["Entrenar con el país, evaluar en Arequipa", "Solo Arequipa", `Arequipa tiene pocos atrasos (${PLZ.panel.arequipa.positivos} obras-mes)`, "Diferencias regionales"]),
  filaT(["Contrato de datos versionado", "Web que lee lo que encuentre", "La web rechaza datos de otro esquema", "Regenerar todo en cada corte"]),
], { x: 0.6, y: 1.4, w: 12.1, colW: [2.9, 2.3, 4.4, 2.5], rowH: 0.72, objectName: "tabla-decisiones" });
s.addNotes("Esto es lo que más nos importa mostrar como ingenieros: cada decisión tiene una alternativa descartada y un costo que aceptamos conscientemente. Ninguna decisión es gratis.");

// 9 · Arquitectura por capas
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Diseño" });
s.addText("Arquitectura: cinco capas desacopladas por archivos", { placeholder: "title" });
const capas = [
  ["Fuentes", "OECE cuaderno · MEF SIAF · INFOBRAS · SEACE · Contraloría", "datos abiertos"],
  ["Ingesta y linaje", "Descarga, depuración, Parquet, huella SHA-256", "Python · DuckDB"],
  ["Inteligencia", `Emparejador · Motor de plazos · ${NVAR} indicadores · Predictor`, "Sentence-BERT · LightGBM"],
  ["Publicación", "JSON por obra + meta.json con esquema y huella del modelo", "puerta de calidad"],
  ["Presentación", "Panorama · Ficha de obra · Cómo predice", "JS modular · GitHub Pages"],
];
capas.forEach(([t, d, tec], i) => {
  const y = 1.4 + i * 1.07;
  caja(s, 0.6, y, 8.4, 0.9, `capa-${i + 1}`, i === 2 ? "E6ECF8" : NIEBLA);
  sello(s, 0.8, y + 0.2, i + 1, i === 2 ? SELLO : PIZARRA);
  texto(s, t, { x: 1.45, y: y + 0.1, w: 2.1, h: 0.7, fontSize: 16, bold: true, valign: "middle", fontFace: "Cambria" });
  texto(s, d, { x: 3.55, y: y + 0.1, w: 3.45, h: 0.7, fontSize: 13, valign: "middle", color: PIZARRA });
  texto(s, tec, { x: 7.05, y: y + 0.1, w: 1.8, h: 0.7, fontSize: 12, valign: "middle", color: SELLO, bold: true, align: "right" });
  if (i < capas.length - 1) flecha(s, 4.8, y + 0.9, 4.8, y + 1.07);
});
texto(s, [
  { text: "Por qué así", options: { bold: true, fontSize: 18, fontFace: "Cambria", breakLine: true } },
  { text: "Cada capa solo lee archivos de la anterior: se puede probar, rehacer o cambiar sin tocar las demás.", options: { breakLine: true, bullet: true } },
  { text: "Lo pesado (IA) corre una vez al mes; la web solo lee JSON pequeños.", options: { breakLine: true, bullet: true } },
  { text: "Sin servidor ni base de datos en línea: no hay credenciales que proteger ni costo de operación.", options: { breakLine: true, bullet: true } },
  { text: "Un catálogo único de indicadores alimenta el modelo, la web y el informe.", options: { bullet: true } },
], { x: 9.3, y: 1.45, w: 3.4, h: 5.3, fontSize: 14, color: PIZARRA, paraSpaceAfter: 8 });
s.addNotes("La arquitectura es deliberadamente simple. El acoplamiento entre capas es por archivos con formato conocido, lo que permite probar cada capa por separado.");

// =====================================================================================
seccion("Cómo construimos los datos y la IA", "Fuentes y corte temporal, pipeline reproducible, emparejador, motor de plazos, indicadores y modelo", "Construcción",
  "Ahora el detalle de construcción, en el orden en que fluyen los datos.");

// 11 · Datos y regla del tiempo
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText("Datos: de dónde sale cada cosa y la regla del tiempo", { placeholder: "title" });
tabla(s, [cabecera(["Fuente", "Qué tomamos", "Cómo se verifica"]),
  filaT(["OECE · cuaderno digital", `${n(P1.nacional.asientos)} asientos del país (jun-2024 a ago-2026)`, "URL y SHA-256 por archivo"]),
  filaT(["MEF · SIAF y Banco de Inversiones", "Devengado mensual, monto viable, problemas", "Solo meses ≤ T"]),
  filaT(["INFOBRAS", "Plazo y fechas originales del contrato", "Datos fijos; nunca el avance actual"]),
  filaT(["SEACE / CONOSCE", "Monto contratado", "Cruce por obra"]),
  filaT(["Contraloría", "Contexto: obras paralizadas", "PDF oficial leído tabla por tabla"]),
], { x: 0.6, y: 1.4, w: 7.4, colW: [2.3, 2.9, 2.2], rowH: 0.62, objectName: "tabla-fuentes" });
caja(s, 8.3, 1.4, 4.4, 3.75, "regla-tiempo", "FBEDEB");
texto(s, "La regla que evita «ver el futuro»", { x: 8.5, y: 1.55, w: 4.0, h: 0.5, fontSize: 16, bold: true, color: ALTO, fontFace: "Cambria" });
s.addShape(pres.shapes.LINE, { x: 8.6, y: 3.05, w: 3.8, h: 0, line: { color: TINTA, width: 2 }, objectName: "eje-tiempo" });
s.addShape(pres.shapes.LINE, { x: 10.2, y: 2.75, w: 0, h: 0.6, line: { color: ALTO, width: 2.5 }, objectName: "corte-T" });
texto(s, "pasado: se usa", { x: 8.6, y: 2.6, w: 1.55, h: 0.35, fontSize: 12, color: BAJO, bold: true });
texto(s, "T", { x: 10.05, y: 3.4, w: 0.3, h: 0.3, fontSize: 14, color: ALTO, bold: true, align: "center" });
texto(s, "T + 60 días: solo para la etiqueta", { x: 10.35, y: 2.45, w: 2.2, h: 0.55, fontSize: 12, color: GRIS });
texto(s, "Cada fin de mes T se toma una foto de la obra con lo escrito hasta T. Lo que pase después solo sirve para saber si se atrasó.",
  { x: 8.5, y: 3.85, w: 4.0, h: 1.2, fontSize: 13, color: PIZARRA });
texto(s, [
  { text: "Unidad de análisis: ", options: { bold: true } },
  { text: `la obra en un mes (${n(PLZ.panel.filas)} obras-mes de ${n(PLZ.panel.obras)} obras). ` },
  { text: "Etiqueta: ", options: { bold: true } },
  { text: "1 si en los 60 días siguientes se anota «valorización menor al 80 %» o «calendario acelerado»." },
], { x: 0.6, y: 5.45, w: 12.1, h: 1.2, fontSize: 16 });
s.addNotes("La regla más importante de todo el proyecto es el corte temporal. Si un indicador usara información posterior a T, el modelo parecería excelente en el laboratorio y fallaría en la realidad. Esa fuga de información es el error más común en estos proyectos.");

// 12 · Pipeline reproducible
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText("El backend es un pipeline reproducible, no un servidor", { placeholder: "title" });
const pipe = [
  ["p01", "Preparar", "asientos y cuadernos"],
  ["p02", "Emparejar", "pares consulta–respuesta"],
  ["p03", "Plazos y panel", "veredictos y obra-mes"],
  ["p03b", "Indicadores", `${NVAR} indicadores con corte T`],
  ["p04", "Modelo", "árboles, calibrador, métricas"],
  ["p05", "Exportar", "JSON + meta.json"],
];
pipe.forEach(([k, t, a], i) => {
  const x = 0.6 + i * 2.05;
  caja(s, x, 1.45, 1.85, 1.95, `pipe-${k}`, i === 1 || i === 4 ? "E6ECF8" : NIEBLA);
  texto(s, k, { x: x + 0.15, y: 1.55, w: 1.55, h: 0.35, fontSize: 12, color: SELLO, bold: true, align: "center" });
  texto(s, t, { x: x + 0.15, y: 1.9, w: 1.55, h: 0.5, fontSize: 16, bold: true, align: "center", fontFace: "Cambria" });
  texto(s, a, { x: x + 0.15, y: 2.45, w: 1.55, h: 0.85, fontSize: 12, color: PIZARRA, align: "center" });
  if (i < pipe.length - 1) flecha(s, x + 1.86, 2.42, x + 2.04, 2.42);
});
tarjeta(s, 0.6, 3.75, 3.9, 2.4, "Reproducible", "Semilla fija, orden determinista en cada consulta a datos y resultados guardados como JSON versionado en git.", SELLO, "rep", "1");
tarjeta(s, 4.7, 3.75, 3.9, 2.4, "Puerta de calidad", "p05 no publica si una probabilidad sale de [0, 1], si un nivel no cuadra con su umbral, si falta una ficha o si queda un nombre sin anonimizar.", ALTO, "gate", "2");
tarjeta(s, 8.8, 3.75, 3.9, 2.4, "Trazable", `Cada corte publica la huella del modelo (${META.modelo.huella}), la del calibrador y el commit del código que lo generó.`, BAJO, "traza", "3");
s.addNotes("Cada script es un paso con entrada y salida claras; se ejecuta una vez por corte mensual. La puerta de calidad impide publicar datos inconsistentes, y la huella permite saber exactamente qué modelo generó lo que ve el usuario.");

// 13 · Emparejador
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText("Componente 1: unir cada respuesta con su consulta", { placeholder: "title" });
imagen(s, "s05_emparejador_lamina.png", 0.6, 1.3, 12.1, 2.9, "flujo-emparejador");
dato(s, 0.6, 4.4, 3.0, 2.3, pc(E.modelo_ia), `acierto de la IA en ${n(E.respuestas)} respuestas de Arequipa`, SELLO, "dato-ia");
dato(s, 3.8, 4.4, 3.0, 2.3, pc(E.regla_mas_reciente), "regla «la consulta más reciente» (comparador)", GRIS, "dato-regla");
texto(s, [
  { text: "Cómo lo evaluamos sin etiquetar a mano: ", options: { bold: true, breakLine: true } },
  { text: "usamos las respuestas que sí citan el número de asiento; esa cita es la respuesta correcta. Borramos el número y pedimos al sistema que adivine. Se entrena con el resto del país y se prueba en Arequipa.", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: `Solo se acepta un enlace de IA con confianza ≥ ${n(E.umbral, 2)}: ${pc(E.precision_con_umbral)} de precisión.`, options: { bold: true, color: SELLO } },
], { x: 7.1, y: 4.45, w: 5.6, h: 2.3, fontSize: 14 });
s.addNotes("Primero reglas, luego IA. Lo valioso es el método de evaluación: miles de ejemplos correctos sin anotar nada a mano. Preferimos dejar una consulta sin enlace antes que inventar un enlace dudoso.");

// 14 · Motor de plazos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText("Componente 2: el motor de plazos aplica la ley, no una opinión", { placeholder: "title" });
imagen(s, "s06_plazos_lamina.png", 0.6, 1.3, 12.1, 2.95, "flujo-plazos");
const rS = QA.por_ruta["Supervisor o inspector"], rP = QA.por_ruta["Entidad y proyectista"];
tabla(s, [cabecera(["Ruta", "Plazo", "Base legal", "Arequipa: a tiempo / tarde / sin respuesta"]),
  filaT(["Supervisor o inspector", "5 días calendario", "RLCE art. 193.3", `${n(rS["A tiempo"])} / ${n(rS.Tarde)} / ${n(rS["Sin respuesta en el cuaderno"])}`]),
  filaT(["Entidad y proyectista", "21 días calendario", "RLCE 193.5–193.8 · RLGCP 190", `${n(rP["A tiempo"])} / ${n(rP.Tarde)} / ${n(rP["Sin respuesta en el cuaderno"])}`]),
], { x: 0.6, y: 4.4, w: 12.1, colW: [2.8, 2.2, 3.1, 4.0], rowH: 0.52, objectName: "tabla-plazos" });
texto(s, "Lenguaje cuidadoso: decimos «sin respuesta en el cuaderno», no «no respondida», porque la respuesta pudo enviarse por carta.",
  { x: 0.6, y: 6.3, w: 12.1, h: 0.45, fontSize: 14, color: ALTO, bold: true });
s.addNotes("Esta parte no usa IA a propósito: los plazos están en el reglamento y deben aplicarse igual siempre. La ruta larga se reconoce por el texto de la respuesta.");

// 15 · Indicadores
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText(`Componente 3: ${NVAR} indicadores en 8 grupos por obra y mes`, { placeholder: "title" });
const EJ = {
  actividad: "asientos 30/90 días, días sin anotar, % del supervisor, ritmo", senales: "ampliaciones previas, suspensiones, penalidades, órdenes",
  consultas: "vencidas, en plazo, respondidas tarde, persistencia", plazo: "plazo consumido frente a avance físico, días restantes",
  contrato: "monto contratado y viable, consorcio, nivel, sector", financiera: "devengado SIAF / viable, meses sin pago",
  historial: "atrasos previos de la entidad y del contratista", calendario: "temporada de lluvias, cierre fiscal, mes",
};
const FU = { actividad: "Cuaderno", senales: "Cuaderno", consultas: "Cuaderno + IA", plazo: "INFOBRAS + texto", contrato: "SEACE, MEF", financiera: "MEF SIAF", historial: "Cuadernos previos", calendario: "Fecha" };
tabla(s, [cabecera(["Grupo", "Qué mide (ejemplos)", "Fuente", "Peso", "Aporte*"]),
  ...Object.keys(GR).sort((a, b) => IG[b] - IG[a]).map((g) => filaT([GR[g], EJ[g], FU[g], `${n(IG[g], 1)} %`, `${AB[g].validacion.caida > 0 ? "+" : ""}${n(AB[g].validacion.caida, 4)}`]))],
{ x: 0.6, y: 1.35, w: 12.1, colW: [3.0, 5.1, 1.8, 1.0, 1.2], rowH: 0.52, objectName: "tabla-indicadores" });
texto(s, "Peso: % de la ganancia de los árboles. *Aporte: cuánto cae la PR-AUC de validación al reentrenar sin el grupo (los 8 ayudan). Fórmula, fuente y cobertura de cada indicador: Anexo D del informe.",
  { x: 0.6, y: 6.25, w: 12.1, h: 0.55, fontSize: 12, color: GRIS });
s.addNotes("Las características que nos preguntaron. Tres grupos salen del cuaderno y cinco de fuentes oficiales: plazo consumido frente a avance, días restantes, ampliaciones previas, monto, ejecución financiera, historial de entidad y contratista, y calendario. Un solo archivo los define, y de él leen el modelo, la web y el informe.");

// 16 · Cómo predice
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText("Componente 4: cómo predice, en cuatro fórmulas", { placeholder: "title" });
imagen(s, "d13_cadena_prediccion.png", 0.6, 1.25, 12.1, 3.35, "cadena-prediccion");
[["Puntaje", `F(x) = Σₖ fₖ(x),  K = ${MOD.arboles.final}`, `Suma de árboles LightGBM sobre los ${NVAR} indicadores; la parada temprana fija K.`],
  ["Probabilidad", "p = 1 / (1 + e^−(A·F + B))", `Platt: A = ${n(MJ.platt.A, 3)}, B = ${n(MJ.platt.B, 3)}, ajustados en validación.`],
  ["Nivel", `ALTO si p ≥ ${n(100 * MOD.niveles.umbral_alto, 2)} %`, `MEDIO si p ≥ ${n(100 * MOD.niveles.umbral_medio, 2)} %: 20 % y 30 % de validación.`],
  ["Razones", "F(x) = φ₀ + Σⱼ φⱼ", "TreeSHAP: φⱼ > 0 sube el riesgo y φⱼ < 0 lo baja."]]
  .forEach(([t, f, d], i) => {
    const x = 0.6 + i * 3.05;
    caja(s, x, 4.8, 2.85, 1.95, `formula-${i + 1}`);
    texto(s, t, { x: x + 0.2, y: 4.9, w: 2.45, h: 0.35, fontSize: 14, bold: true, color: SELLO });
    texto(s, f, { x: x + 0.2, y: 5.28, w: 2.45, h: 0.5, fontSize: 15, fontFace: "Cambria Math" });
    texto(s, d, { x: x + 0.2, y: 5.85, w: 2.45, h: 0.8, fontSize: 12, color: GRIS });
  });
s.addNotes("Así predice, sin cajas negras. Una suma de árboles da un puntaje; Platt lo convierte en probabilidad; los umbrales de validación dan el nivel; y TreeSHAP reparte el puntaje entre los indicadores para explicar cada alerta.");

// 17 · Cómo evitamos engañarnos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Construcción" });
s.addText("Cómo evitamos engañarnos al evaluar", { placeholder: "title" });
imagen(s, "g01_particion_temporal.png", 0.6, 1.3, 7.3, 2.45, "particion");
tabla(s, [cabecera(["Métrica", "Fórmula", "Por qué esa"]),
  filaT(["PR-AUC (principal)", "Σₙ (Rₙ − Rₙ₋₁) Pₙ", `El atraso es raro (${pc(AQ.prevalencia)})`]),
  filaT(["Precisión@20 %", "TP₂₀ / N₂₀", "Capacidad real de revisión"]),
  filaT(["Lift@20 %", "Precisión@20 / π", "Veces mejor que el azar"]),
  filaT(["Brier", "(1/N) Σ (p − y)²", "¿Se puede creer la probabilidad?"]),
  filaT(["IC 95 %", "bootstrap por obra ×1 000", "Los meses de una obra no son independientes"]),
], { x: 0.6, y: 3.95, w: 7.3, colW: [1.9, 2.4, 3.0], rowH: 0.44, objectName: "tabla-metricas" });
texto(s, [
  { text: "Lista de control", options: { bold: true, fontSize: 18, fontFace: "Cambria", breakLine: true } },
  { text: "Entrenar en el pasado, probar en meses que el modelo nunca vio.", options: { bullet: true, breakLine: true } },
  { text: "Cinco comparadores: azar, regla, regresión logística, solo cuaderno y cuaderno + consultas.", options: { bullet: true, breakLine: true } },
  { text: "Modelo final elegido por validación; la prueba se mira una sola vez.", options: { bullet: true, breakLine: true } },
  { text: "Bootstrap pareado para comparar modelos.", options: { bullet: true, breakLine: true } },
  { text: "Ablación: reentrenar sin cada grupo.", options: { bullet: true, breakLine: true } },
  { text: `No usamos la exactitud: decir siempre «no se atrasa» acertaría ${pc(1 - AQ.prevalencia)}.`, options: { bullet: true, color: ALTO, bold: true } },
], { x: 8.2, y: 1.35, w: 4.5, h: 5.4, fontSize: 14, color: PIZARRA, paraSpaceAfter: 8 });
s.addNotes("La pregunta que nos hicieron la vez pasada: qué métricas y por qué. Cada métrica responde una pregunta concreta y tiene su fórmula. La lista de control es cómo nos protegemos de resultados demasiado buenos para ser ciertos.");

// =====================================================================================
seccion("Qué obtuvimos", "Resultados medidos fuera de tiempo, con su incertidumbre y sin esconder lo que no salió", "Resultados",
  "Resultados en tres diapositivas: la vista general, qué aporta cada grupo y un ejemplo resuelto.");

// 19 · Resultados en una vista
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText("Resultados en una vista (prueba enero–junio de 2026)", { placeholder: "title" });
dato(s, 0.6, 1.4, 3.85, 2.4, n(MN.pr_auc, 3), `PR-AUC nacional frente a una tasa base de ${pc(NA.prevalencia)}; supera a la regla, la logística y al modelo solo cuaderno`, SELLO, "dato-prauc");
dato(s, 4.73, 1.4, 3.85, 2.4, pc(M.precision_top20), `de las obras marcadas en Arequipa se atrasó (azar: ${pc(AQ.prevalencia)}): ${n(M.lift_top20, 1)} veces más eficaz`, ALTO, "dato-p20");
dato(s, 8.85, 1.4, 3.85, 2.4, `${n(ANT.dias_anticipacion_mediana, 0)} días`, `de anticipación mediana; ${pc(ANT.pct_alertadas / 100, 0)} de las obras que se atrasaron tuvo antes alerta alta`, BAJO, "dato-anticipacion");
s.addChart(pres.charts.BAR, [{ name: "Atraso observado", labels: ["Riesgo bajo", "Riesgo medio", "Riesgo alto"],
  values: ["BAJO", "MEDIO", "ALTO"].map((k) => Math.round(1000 * MOD.niveles.arequipa.find((x) => x.nivel === k).tasa_observada) / 10) }],
{ x: 0.6, y: 4.05, w: 6.2, h: 2.75, barDir: "col", chartColors: [BAJO, MEDIO, ALTO], valAxisMinVal: 0, valAxisMaxVal: 20,
  dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"', dataLabelPosition: "outEnd", showTitle: true,
  title: "Arequipa: obras-mes que se atrasaron, según el nivel asignado", ...ejes, objectName: "grafico-niveles" });
caja(s, 7.1, 4.05, 5.6, 2.75, "honestidad", "FBEDEB");
texto(s, [
  { text: "Lo que no salió tan bien (y lo decimos)", options: { bold: true, color: ALTO, fontFace: "Cambria", fontSize: 16, breakLine: true } },
  { text: `En Arequipa (${AQ.positivos} atrasos) solo la ventaja frente al azar es concluyente; el modelo cuaderno + consultas obtuvo una PR-AUC algo mayor (${n(AQ.modelos["M1 LightGBM cuaderno + consultas"].pr_auc, 3)} frente a ${n(M.pr_auc, 3)}). Mantuvimos el modelo elegido en validación: cambiarlo mirando la prueba sería hacer trampa.` },
], { x: 7.35, y: 4.2, w: 5.1, h: 2.5, fontSize: 14, color: PIZARRA });
s.addNotes(`Tres números para recordar y una advertencia honesta. En el país, con ${NA.positivos} atrasos, la mejora es significativa (p = ${n(PARN["B3 LightGBM solo cuaderno"].p_unilateral, 3)} frente al modelo solo cuaderno). En Arequipa la muestra es chica y lo decimos.`);

// 20 · Qué pesa y qué aporta
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText("Qué usa el modelo y qué aporta de verdad cada grupo", { placeholder: "title" });
const gOrden = Object.keys(GR).sort((a, b) => IG[a] - IG[b]);
s.addChart(pres.charts.BAR, [{ name: "Peso", labels: gOrden.map((g) => GR[g]), values: gOrden.map((g) => IG[g]) }],
  { x: 0.6, y: 1.3, w: 6.0, h: 5.45, barDir: "bar", chartColors: [SELLO], valAxisMinVal: 0, dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"',
    dataLabelPosition: "outEnd", showTitle: true, title: "Peso de cada grupo en el modelo (gain)", ...ejes, objectName: "grafico-importancia" });
const CORTO = { actividad: "Actividad", senales: "Señales formales", consultas: "Consultas y plazos", plazo: "Plazo y avance", contrato: "Contrato", financiera: "Ejecución financiera", historial: "Historial", calendario: "Calendario" };
const gAbl = Object.keys(GR).sort((a, b) => AB[a].nacional.caida - AB[b].nacional.caida);
s.addChart(pres.charts.BAR, [{ name: "Caída PR-AUC nacional", labels: gAbl.map((g) => `${CORTO[g]} (${AB[g].nacional.caida > 0 ? "+" : ""}${n(AB[g].nacional.caida, 3)})`), values: gAbl.map((g) => Math.round(10000 * AB[g].nacional.caida) / 10000) }],
  { x: 6.9, y: 1.3, w: 5.8, h: 4.3, barDir: "bar", chartColors: [ALTO], dataLabelFormatCode: "+0.000;-0.000", valAxisLabelFormatCode: "0.00",
    showTitle: true, title: "Ablación: cuánto cae la PR-AUC nacional sin el grupo", ...ejes, showValue: false, catAxisLabelPos: "low", objectName: "grafico-ablacion" });
texto(s, "Peso no es aporte: el contrato pesa mucho pero, si se quita, otros grupos cubren su información. Lo que más mejora la predicción del país son las señales formales y el plazo frente al avance.",
  { x: 6.9, y: 5.75, w: 5.8, h: 1.0, fontSize: 13, color: PIZARRA });
s.addNotes("Distinguimos dos preguntas: cuánto usa el modelo cada grupo y cuánto se pierde al quitarlo. Las señales formales del cuaderno, como ampliaciones previas y penalidades, son las que más aportan.");

// 21 · Ejemplo resuelto
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText(`Ejemplo resuelto: por qué una obra tiene ${pc(OBRA1.riesgo.probabilidad)} de riesgo`, { placeholder: "title" });
imagen(s, "g10_ejemplo_cascada.png", 0.6, 1.3, 8.0, 5.45, "cascada");
texto(s, [
  { text: OBRA1.nombre.length > 110 ? OBRA1.nombre.slice(0, 107) + "…" : OBRA1.nombre, options: { bold: true, breakLine: true } },
  { text: `${OBRA1.entidad} · ${OBRA1.distrito}`, options: { color: GRIS, breakLine: true, fontSize: 12 } },
  { text: " ", options: { breakLine: true } },
  { text: `Se parte de la base φ₀ = ${n(MJ.base_logit, 2)}, se suman las contribuciones y se aplica Platt: p = ${pc(OBRA1.riesgo.probabilidad)}, nivel ${OBRA1.riesgo.nivel}, ${n(OBRA1.riesgo.veces_tasa_base, 1)} veces la tasa base.`, options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Es la misma cuenta que hace la web: cada alerta se puede auditar.", options: { bold: true, color: SELLO } },
], { x: 8.9, y: 1.4, w: 3.8, h: 5.3, fontSize: 14, color: PIZARRA });
s.addNotes("Con números reales. Por eso podemos defender cada alerta frente a un supervisor o un auditor: no es una opinión de la máquina, es una suma que se puede revisar indicador por indicador.");

// =====================================================================================
seccion("Del modelo a la pantalla", "Cómo se conecta el ML con la interfaz, cómo aseguramos la calidad y cómo nos organizamos", "Producto",
  "La última parte responde cómo llega el modelo al usuario, cómo sabemos que funciona y cómo trabajamos como equipo.");

// 23 · Del modelo a la pantalla
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Producto" });
s.addText("Del modelo a la pantalla: un contrato de datos versionado", { placeholder: "title" });
const cadena = [["modelo + calibrador", "salidas de p04", SELLO], ["p05 · puerta de calidad", "valida y anonimiza", ALTO], ["JSON + meta.json", `esquema ${META.esquema} · huella`, PIZARRA], ["Web modular", "verifica el esquema", BAJO]];
cadena.forEach(([t, d, c], i) => {
  const x = 0.6 + i * 3.1;
  caja(s, x, 1.4, 2.75, 1.25, `cadena-${i + 1}`);
  sello(s, x + 0.2, 1.55, i + 1, c, 0.42);
  texto(s, t, { x: x + 0.75, y: 1.5, w: 1.9, h: 0.6, fontSize: 14, bold: true, valign: "middle" });
  texto(s, d, { x: x + 0.75, y: 2.1, w: 1.9, h: 0.45, fontSize: 12, color: GRIS });
  if (i < cadena.length - 1) flecha(s, x + 2.76, 2.02, x + 3.09, 2.02);
});
imagen(s, "c02_ficha.png", 0.6, 2.95, 6.6, 3.85, "captura-ficha");
texto(s, [
  { text: "Tres vistas, un propósito cada una", options: { bold: true, fontSize: 17, fontFace: "Cambria", breakLine: true } },
  { text: "Panorama: ", options: { bold: true } }, { text: "qué obras revisar primero.", options: { breakLine: true } },
  { text: "Ficha: ", options: { bold: true } }, { text: "riesgo, evolución, razones, consultas y el asiento como prueba.", options: { breakLine: true } },
  { text: "Cómo predice: ", options: { bold: true } }, { text: "fórmulas, ejemplo resuelto, métricas y catálogo.", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Código: ", options: { bold: true } }, { text: "módulos ES sin dependencias (datos, formato, gráficos, vistas), enrutador por hash, CSP estricta y todo texto escapado.", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: `El pie de página muestra el corte, la huella del modelo ${META.modelo.huella} y el commit.`, options: { color: SELLO, bold: true } },
], { x: 7.5, y: 2.95, w: 5.2, h: 3.85, fontSize: 14, color: PIZARRA });
s.addNotes("La conexión entre el ML y la interfaz no es un servidor sino un contrato: el modelo entrenado se aplica en p05, que valida y publica JSON con una versión de esquema y la huella del modelo. Si la web recibe datos de otro esquema, se niega a mostrarlos.");

// 24 · Calidad de ingeniería
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Producto" });
s.addText("Calidad de ingeniería medida, no prometida", { placeholder: "title" });
dato(s, 0.6, 1.4, 2.9, 2.3, `${WEB.pruebas.passed}`, "pruebas automáticas en verde, también en GitHub Actions", BAJO, "dato-pruebas");
dato(s, 3.7, 1.4, 2.9, 2.3, `${Object.values(WEB.axe_violaciones_wcag_aa).reduce((a, b) => a + b, 0)}`, "violaciones WCAG 2 AA (axe-core) en las 3 vistas", BAJO, "dato-axe");
dato(s, 6.8, 1.4, 2.9, 2.3, `${n(WEB.ms_lista_hasta_mostrar_obras_mediana)} ms`, "hasta ver la lista de obras (mediana de 5 cargas)", SELLO, "dato-ms");
dato(s, 9.9, 1.4, 2.8, 2.3, `${WEB.errores_consola}`, "errores de consola; ningún dato personal publicado", BAJO, "dato-errores");
tabla(s, [cabecera(["Qué se prueba", "Cómo", "Por qué importa"]),
  filaT(["Reglas de texto y anonimización", "Casos de citas, DNI, CIP, correos y nombres", "Un enlace o un nombre mal leído rompe la confianza"]),
  filaT(["Catálogo de indicadores", "53 indicadores con fórmula, fuente y frase válidas", "El modelo, la web y el informe dicen lo mismo"]),
  filaT(["Contrato pipeline → web", "Esquema, una ficha por obra, niveles coherentes", "La web nunca muestra datos mezclados"]),
  filaT(["Recorrido en navegador", "Escritorio y móvil, filtros, orden, rutas inválidas", "Lo que ve el usuario funciona de verdad"]),
], { x: 0.6, y: 4.0, w: 12.1, colW: [3.2, 4.6, 4.3], rowH: 0.55, objectName: "tabla-pruebas" });
s.addNotes("Las cifras de esta diapositiva salen de resultados/prototipo.json, que se genera automáticamente. Las pruebas no necesitan los datos privados, por eso corren en GitHub Actions en cada cambio.");

// 25 · Organización del equipo
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Producto" });
s.addText("Cómo nos organizamos: roles e hitos", { placeholder: "title" });
[["Datos e ingesta", "Fuentes, linaje, depuración y regla del corte temporal (p01, p03b)."],
  ["IA y modelo", "Emparejador, indicadores, entrenamiento, validación y explicación (p02, p04)."],
  ["Backend del pipeline", "Motor de plazos, exportación, contrato de datos y puerta de calidad (p03, p05)."],
  ["Frontend", "Vistas, accesibilidad, rendimiento y seguridad de la web."],
  ["Calidad y gestión", "Pruebas, CI, informe GESITI, diapositivas y control de cambios."]]
  .forEach(([t, d], i) => {
    const y = 1.35 + i * 1.08;
    caja(s, 0.6, y, 6.3, 0.95, `rol-${i + 1}`);
    sello(s, 0.78, y + 0.24, i + 1, SELLO, 0.46);
    texto(s, t, { x: 1.45, y: y + 0.08, w: 5.3, h: 0.38, fontSize: 15, bold: true, fontFace: "Cambria" });
    texto(s, d, { x: 1.45, y: y + 0.46, w: 5.3, h: 0.45, fontSize: 12, color: PIZARRA });
  });
const hitos = [["H1", "Problema y datos verificados", true], ["H2", "Emparejador y motor de plazos", true], ["H3", "Indicadores y modelo validado", true],
  ["H4", "Web publicada con contrato y pruebas", true], ["H5", "Informe y sustentación", true], ["H6", "Prueba con supervisores (SUS)", false]];
hitos.forEach(([k, t, ok], i) => {
  const y = 1.35 + i * 0.9;
  sello(s, 7.3, y + 0.1, k, ok ? BAJO : MEDIO, 0.6);
  texto(s, t, { x: 8.05, y: y + 0.1, w: 3.5, h: 0.6, fontSize: 15, valign: "middle", bold: !ok });
  texto(s, ok ? "logrado" : "pendiente", { x: 11.55, y: y + 0.1, w: 1.15, h: 0.6, fontSize: 13, valign: "middle", color: ok ? BAJO : MEDIO, bold: true, align: "right" });
});
s.addNotes("Nos organizamos por responsabilidades del sistema, no por pantallas. Cada rol es dueño de un tramo del pipeline y de sus pruebas. Avanzamos por hitos verificables; el único pendiente es la prueba con supervisores reales.");

// 26 · Riesgos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Producto" });
s.addText("Riesgos que anticipamos y cómo los controlamos", { placeholder: "title" });
tabla(s, [cabecera(["Riesgo", "Qué pasaría", "Control que ya está implementado"]),
  filaT(["Fuga de información temporal", "Métricas infladas que fallan en la realidad", "Corte T en cada indicador; prueba temporal"]),
  filaT(["Enlace consulta–respuesta equivocado", "Veredicto de plazo falso", `Umbral de confianza ${n(E.umbral, 2)} (${pc(E.precision_con_umbral)} de precisión)`]),
  filaT(["Uso de la alerta como acusación", "Daño a personas o empresas", "Se presenta como prioridad de revisión, con su prueba"]),
  filaT(["Datos personales en los asientos", "Incumplir la Ley 29733", "Anonimización + prueba + puerta de calidad"]),
  filaT(["Pocos casos en Arequipa", "Conclusiones locales frágiles", "Entrenar con el país; intervalos por obra"]),
  filaT(["Cambio de formato del OECE o deriva", "Datos mezclados o modelo desactualizado", "Contrato con esquema; recalibrar y revisar tasas por nivel en cada corte"]),
], { x: 0.6, y: 1.35, w: 12.1, colW: [3.3, 3.5, 5.3], rowH: 0.72, objectName: "tabla-riesgos" });
s.addNotes("Pensar en los riesgos antes es parte del diseño. Los controles de la tercera columna ya existen en el código o en el método; la revisión de tasas por nivel en cada corte es el procedimiento de operación previsto.");

// 27 · Límites y siguientes pasos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Producto" });
s.addText("Límites y siguientes pasos", { placeholder: "title" });
tarjeta(s, 0.6, 1.4, 5.9, 4.3, "Límites que declaramos", "Predice el atraso legal (menos del 80 % de lo programado), no la paralización.\n\nSolo obras por contrata con cuaderno digital, desde junio de 2024.\n\nNo ve las respuestas enviadas por carta.\n\nEl avance físico y el monto tienen poca cobertura en las fuentes.", MEDIO, "limites", "!");
tarjeta(s, 6.8, 1.4, 5.9, 4.3, "Siguientes pasos", "Prueba de uso (SUS) con supervisores y Órganos de Control de Arequipa.\n\nPedir al OECE que publique el identificador de asiento para validar los enlaces.\n\nPredecir también la ampliación de plazo por consultas sin absolver.\n\nActualización mensual automática y extensión a otras regiones.", BAJO, "pasos", "→");
s.addNotes("Mejor decir los límites nosotros. Ninguno invalida el resultado; delimitan lo que podemos afirmar. Los pasos siguientes atacan directamente esos límites.");

// 28 · Conclusiones
s = pres.addSlide({ masterName: "SECCION", sectionTitle: "Producto" });
s.addText("Lo que demostramos", { placeholder: "title" });
s.addText([
  { text: `Con datos abiertos e IA se reconstruye lo que el Estado no publica: qué respuesta contesta qué consulta (${pc(E.modelo_ia)} de acierto).`, options: { bullet: { type: "number" }, breakLine: true } },
  { text: `Las respuestas son poco trazables: solo ${pc(QA.pct_respondidas_enlazadas / 100, 0)} queda en el cuaderno y ${pc(QA.pct_tarde_entre_respondidas / 100, 0)} llega tarde.`, options: { bullet: { type: "number" }, breakLine: true } },
  { text: `Leer el cuaderno y cruzarlo con plazo, dinero e historial anticipa el atraso: PR-AUC ${n(MN.pr_auc, 3)} (base ${pc(NA.prevalencia)}) y ${n(ANT.dias_anticipacion_mediana, 0)} días de aviso.`, options: { bullet: { type: "number" }, breakLine: true } },
  { text: "Todo con decisiones justificadas, pruebas automáticas, costo cero y cada alerta explicada con su prueba escrita.", options: { bullet: { type: "number" } } },
], { placeholder: "body", fontSize: 18, color: BLANCO, paraSpaceAfter: 10 });
s.addNotes("Cerramos con una idea: el Estado ya publica la caja negra de cada obra; con buena ingeniería se puede leer a tiempo.");

// =====================================================================================
// Anexos para preguntas
pres.addSection({ title: "Anexos" });
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Anexos" });
s.addText("Anexo A · Patrones en los datos de entrenamiento", { placeholder: "title" });
const PSEL = ["asientos_30d", "penalidades", "ampliaciones", "alertas_90d", "consultas_vencidas", "pct_respondidas_tarde", "dias_restantes_plazo", "entidad_atrasos_previos"]
  .map((v) => PAT.patrones.find((x) => x.variable === v));
const ETQ = { asientos_30d: "Anotaciones último mes", penalidades: "Penalidades anotadas", ampliaciones: "Ampliaciones previas", alertas_90d: "Alertas en 90 días",
  consultas_vencidas: "Consultas vencidas", pct_respondidas_tarde: "% respondidas tarde", dias_restantes_plazo: "Días de plazo restantes", entidad_atrasos_previos: "Atrasos previos de la entidad" };
s.addChart(pres.charts.BAR, [
  { name: "Valor bajo (≤ p25)", labels: PSEL.map((x) => ETQ[x.variable]), values: PSEL.map((x) => Math.round(1000 * x.tasa_bajo) / 10) },
  { name: "Valor alto (> p75)", labels: PSEL.map((x) => ETQ[x.variable]), values: PSEL.map((x) => Math.round(1000 * x.tasa_alto) / 10) },
], { x: 0.6, y: 1.3, w: 8.3, h: 5.45, barDir: "bar", barGrouping: "clustered", chartColors: ["9AA7B4", ALTO], valAxisMinVal: 0,
  dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"', dataLabelPosition: "outEnd", ...ejes, showLegend: true, legendPos: "b", legendFontSize: 12,
  showTitle: true, title: "Tasa de atraso a 60 días según el valor del indicador", objectName: "grafico-patrones" });
texto(s, [
  { text: `${n(PAT.filas)} obras-mes de entrenamiento y validación; tasa base ${pc(PAT.tasa_base)}. La prueba no se miró.`, options: { breakLine: true, color: GRIS } },
  { text: " ", options: { breakLine: true } },
  { text: `Penalidades anotadas: ${n(PSEL[1].razon_alto_bajo, 1)} veces más riesgo.`, options: { breakLine: true } },
  { text: `Consultas vencidas: ${n(PSEL[4].razon_alto_bajo, 1)} veces.`, options: { breakLine: true } },
  { text: `Obra con mucha actividad: ${n(PSEL[0].razon_alto_bajo, 1)} veces.`, options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Son asociaciones, no causas: el modelo combina todos los indicadores.", options: { bold: true, color: SELLO } },
], { x: 9.2, y: 1.5, w: 3.5, h: 5.2, fontSize: 14, color: PIZARRA });
s.addNotes("Para preguntas sobre patrones: antes de modelar miramos cómo cambia la tasa de atraso según cada indicador, solo con datos de entrenamiento.");

s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Anexos" });
s.addText("Anexo B · Resultados completos de la prueba", { placeholder: "title" });
const NOM = { "B0 Tasa base": "B0 Azar (tasa base)", "B1 Regla: consultas vencidas": "B1 Regla: consultas vencidas", "B2 Regresión logística": "B2 Regresión logística",
  "B3 LightGBM solo cuaderno": "B3 LightGBM solo cuaderno", "M1 LightGBM cuaderno + consultas": "M1 Cuaderno + consultas", "M Caja Negra": "M Caja Negra (8 grupos)" };
tabla(s, [cabecera(["Modelo", "PR-AUC Arequipa [IC 95 %]", "Precisión@20 AQP", "PR-AUC nacional [IC 95 %]", "p (M mejor) nacional"]),
  ...Object.keys(AQ.modelos).map((k) => filaT([NOM[k],
    `${n(AQ.modelos[k].pr_auc, 3)} [${n(AQ.modelos[k].pr_auc_ic95[0], 3)}–${n(AQ.modelos[k].pr_auc_ic95[1], 3)}]`, pc(AQ.modelos[k].precision_top20),
    `${n(NA.modelos[k].pr_auc, 3)} [${n(NA.modelos[k].pr_auc_ic95[0], 3)}–${n(NA.modelos[k].pr_auc_ic95[1], 3)}]`,
    PARN[k] ? (PARN[k].p_unilateral < 0.001 ? "< 0,001" : n(PARN[k].p_unilateral, 3)) : "—"], 13, k === "M Caja Negra" ? [0, 1, 2, 3, 4] : [0]))],
{ x: 0.6, y: 1.4, w: 12.1, colW: [3.2, 2.6, 1.8, 2.6, 1.9], rowH: 0.62, objectName: "tabla-resultados" });
texto(s, `Prueba: Arequipa ${n(AQ.filas)} obras-mes y ${AQ.positivos} atrasos; país ${n(NA.filas)} obras-mes y ${NA.positivos} atrasos. Valor p: bootstrap pareado por obra, 1 000 remuestreos. Selección por PR-AUC de validación: ${Object.entries(MOD.seleccion.pr_auc_validacion).map(([k, v]) => `${k === "M2" ? "M" : k} ${n(v, 3)}`).join(" · ")}.`,
  { x: 0.6, y: 6.0, w: 12.1, h: 0.75, fontSize: 12, color: GRIS });
s.addNotes("Tabla completa para responder cualquier pregunta sobre comparadores e intervalos.");

const salida = path.join(RAIZ, "diapositivas", "Caja_Negra_de_Obra.pptx");
pres.writeFile({ fileName: salida }).then(async () => {
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(salida, THEME);
  console.log("ok", salida);
});
