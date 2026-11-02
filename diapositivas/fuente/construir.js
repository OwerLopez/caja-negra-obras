// Construye diapositivas/Caja_Negra_de_Obra.pptx (exposición). Cifras leídas de resultados/*.json.
// Uso: NODE_PATH=<carpeta con pptxgenjs> node diapositivas/fuente/construir.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), "utf8"));
const P1 = leer("resultados/p01_resumen.json"), EMP = leer("resultados/p02_emparejador.json");
const PLZ = leer("resultados/p03_plazos.json"), MOD = leer("resultados/p04_modelo.json"), RES = leer("web/data/resumen.json");
const n = (x, d = 0) => { const [e, f] = Number(x).toFixed(d).split("."); const ent = e.replace(/\B(?=(\d{3})+(?!\d))/g, " "); return f ? `${ent},${f}` : ent; };
const pc = (x, d = 1) => `${n(100 * x, d)} %`;
const AQ = MOD.resultados.arequipa, M = AQ.modelos["M Caja Negra (LightGBM + consultas)"];
const B = (k) => AQ.modelos[k];
const E = EMP.evaluacion.prueba, QA = PLZ.arequipa, ANT = MOD.anticipacion.arequipa;
const NIV = Object.fromEntries(MOD.niveles.arequipa.map((x) => [x.nivel, x]));

const TINTA = "1C2A39", SELLO = "2B4C9B", ALTO = "B42318", BAJO = "2F6F4B", MEDIO = "9A6410", GRIS = "4B5A6A", NIEBLA = "E9ECEA", BLANCO = "FFFFFF";
const THEME = { name: "Caja Negra", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: TINTA, lt1: BLANCO, dk2: "26384D", lt2: NIEBLA, accent1: SELLO, accent2: ALTO, accent3: BAJO, accent4: MEDIO,
    accent5: "7A8796", accent6: "C9D1D9", hlink: SELLO, folHlink: "5A4B9B" } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "Caja Negra de Obra";
pres.author = "Ower Frank López";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: "PORTADA", background: { color: TINTA },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 11.7, h: 1.9, fontSize: 40, bold: true, color: C.background1, valign: "bottom", fontFace: "Cambria" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.1, w: 11.7, h: 2.2, fontSize: 18, color: "C9D1D9", valign: "top" }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "CONTENIDO", background: { color: BLANCO }, margin: [0.5, 0.6, 0.6, 0.6],
  slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: GRIS },
  objects: [
    { text: { text: "Caja Negra de Obra · Arequipa", options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: GRIS, isTextBox: true } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.95, fontSize: 28, bold: true, color: C.text1, valign: "middle", fontFace: "Cambria" }, text: "" } },
  ] });
pres.defineSlideMaster({ title: "MENSAJE", background: { color: TINTA },
  slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: "9AA7B4" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.95, fontSize: 28, bold: true, color: C.background1, valign: "middle", fontFace: "Cambria" }, text: "" } },
  ] });

function imagen(slide, archivo, x, y, maxW, maxH, nombre) {
  const buf = fs.readFileSync(path.join(RAIZ, "informe", "figuras", archivo));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  let W = maxW, H = (maxW * h) / w;
  if (H > maxH) { H = maxH; W = (maxH * w) / h; }
  slide.addImage({ data: "image/png;base64," + buf.toString("base64"), x: x + (maxW - W) / 2, y: y + (maxH - H) / 2, w: W, h: H, objectName: nombre, altText: nombre });
}
const texto = (slide, t, o) => slide.addText(t, { isTextBox: true, fontFace: "Calibri", color: TINTA, fontSize: 16, valign: "top", margin: 0, ...o });
function dato(slide, x, y, w, cifra, etiqueta, color, nombre) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 2.2, fill: { color: "F3F5F7" }, line: { color: "D5DBE1", width: 1 }, rectRadius: 0.08, objectName: nombre });
  texto(slide, cifra, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: 1.0, fontSize: 40, bold: true, color, fontFace: "Cambria", valign: "middle" });
  texto(slide, etiqueta, { x: x + 0.25, y: y + 1.25, w: w - 0.5, h: 0.85, fontSize: 14, color: GRIS });
}
function tarjeta(slide, x, y, w, h, titulo, cuerpo, color, nombre) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: "F3F5F7" }, line: { color: "D5DBE1", width: 1 }, rectRadius: 0.08, objectName: nombre });
  slide.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.28, w: 0.42, h: 0.42, fill: { color }, line: { color }, objectName: nombre + "-punto" });
  texto(slide, titulo, { x: x + 0.85, y: y + 0.22, w: w - 1.05, h: 0.55, fontSize: 18, bold: true, valign: "middle" });
  texto(slide, cuerpo, { x: x + 0.25, y: y + 0.95, w: w - 0.5, h: h - 1.15, fontSize: 15, color: "26384D" });
}
const ejes = { catAxisLabelColor: GRIS, valAxisLabelColor: GRIS, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  dataLabelFontFace: "+mn-lt", catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, dataLabelFontSize: 13, dataLabelColor: TINTA,
  valGridLine: { color: "E3E7EB", size: 1 }, catGridLine: { style: "none" }, showLegend: false, showValue: true };

// 1 Portada
pres.addSection({ title: "Problema" });
let s = pres.addSlide({ masterName: "PORTADA", sectionTitle: "Problema" });
s.addText("Caja Negra de Obra", { placeholder: "title" });
s.addText([
  { text: "Inteligencia artificial sobre el cuaderno de obra digital para auditar consultas y anticipar atrasos en obras públicas de Arequipa", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Ower Frank López y equipo · Gestión de Sistemas y Tecnologías de Información · UNSA · noviembre 2026", options: { fontSize: 14, color: "9AA7B4" } },
], { placeholder: "body" });
s.addNotes("Presentamos Caja Negra de Obra: un sistema que lee el cuaderno de obra digital de las obras públicas de Arequipa, mide si las consultas se responden a tiempo y avisa qué obras van camino al atraso, siempre con la prueba escrita.");

// 2 El problema en una frase
s = pres.addSlide({ masterName: "MENSAJE", sectionTitle: "Problema" });
s.addText("El problema en una frase", { placeholder: "title" });
texto(s, "Las señales de que una obra se está trabando quedan escritas en el cuaderno de obra, pero se leen tarde: cuando el atraso ya ocurrió.",
  { x: 0.6, y: 1.7, w: 12.1, h: 1.9, fontSize: 30, color: BLANCO, fontFace: "Cambria", italic: true });
texto(s, "Cuando un avión cae, se lee su caja negra para saber qué pasó. En una obra pública, la caja negra es el cuaderno de obra: ahí el residente y el supervisor anotan todo, todos los días. Nosotros la leemos mientras la obra está viva, para evitar el accidente.",
  { x: 0.6, y: 4.2, w: 11.0, h: 1.8, fontSize: 20, color: "C9D1D9" });
s.addNotes("Esta es la idea central. No hablamos de todas las causas del atraso: hablamos de una pieza concreta y medible. El residente pregunta en el cuaderno, la ley le da al supervisor 5 días para responder, y nadie mide si eso se cumple. La metáfora de la caja negra ayuda a recordarlo.");

// 3 Evidencia
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Problema" });
s.addText("La evidencia: el problema existe y se puede medir", { placeholder: "title" });
dato(s, 0.6, 1.6, 2.9, "126", "obras paralizadas en Arequipa, S/ 8 383 millones (Contraloría, mar-2026)", ALTO, "dato-paralizadas");
dato(s, 3.7, 1.6, 2.9, n(P1.arequipa.asientos), `asientos en ${n(P1.arequipa.cuadernos)} cuadernos de Arequipa: unos ${n(P1.arequipa.asientos / P1.arequipa.cuadernos)} por obra`, SELLO, "dato-asientos");
dato(s, 6.8, 1.6, 2.9, `${n(QA.pct_respondidas_enlazadas, 0)} %`, `de las ${n(QA.consultas_residente)} consultas del residente tiene respuesta en el cuaderno`, MEDIO, "dato-trazables");
dato(s, 9.9, 1.6, 2.8, `${n(QA.pct_tarde_entre_respondidas, 0)} %`, "de las respuestas llegó fuera del plazo legal", ALTO, "dato-tarde");
texto(s, "Fuentes: Contraloría vía prensa (cotejar con el PDF oficial); el resto es cálculo propio sobre los datos abiertos del OECE, junio 2024 a agosto 2026.",
  { x: 0.6, y: 4.2, w: 12.1, h: 0.5, fontSize: 12, color: GRIS });
texto(s, "Nadie puede leer cientos de asientos por obra cada mes. Y los datos abiertos no dicen qué respuesta corresponde a qué consulta: por eso hoy nadie sabe cuánto se demoran.",
  { x: 0.6, y: 4.9, w: 12.1, h: 1.2, fontSize: 20, bold: true });
s.addNotes("Cuatro números para entender la escala. El dato de 37 % es importante: casi dos de cada tres consultas no tienen una respuesta registrada en el cuaderno. Puede que se hayan respondido por carta, pero el cuaderno no lo muestra. Eso ya es un problema de gestión de la información.");

// 4 Árbol de problemas
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Problema" });
s.addText("¿Por qué pasa? Árbol de problemas", { placeholder: "title" });
imagen(s, "d01_arbol_problema.png", 0.6, 1.4, 12.1, 5.4, "arbol-problemas");
s.addNotes("A la izquierda las causas: consultas que el expediente no resolvió, plazos legales, falta de medición y falta de personal para leer. En el centro el problema. A la derecha los efectos: atraso legal, ampliaciones, paralizaciones y un control que llega tarde.");

// 5 Qué existe y qué falta
pres.addSection({ title: "Brecha y objetivo" });
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Brecha y objetivo" });
s.addText("Qué existe y qué falta", { placeholder: "title" });
tarjeta(s, 0.6, 1.5, 5.9, 5.1, "Lo que ya existe", "INFOBRAS y el seguimiento del MEF: fotos del estado de cada obra.\n\nEstudios de causas con encuestas, expertos o revisión manual.\n\nModelos de aprendizaje automático con datos estructurados (monto, plazo, avance declarado).\n\nAnalítica de riesgo en contrataciones (Funes, Alice).", GRIS, "existe");
tarjeta(s, 6.8, 1.5, 5.9, 5.1, "Lo que falta (nuestra brecha)", "Leer el cuaderno de obra, el texto de la ejecución diaria.\n\nSaber qué respuesta contesta qué consulta: el enlace oficial no se puede usar.\n\nMedir si se cumple el plazo legal y quién lo incumple.\n\nAvisar antes, con la prueba escrita a la vista.", SELLO, "falta");
s.addNotes("No decimos que nadie haya hecho analítica de obras. Decimos que nadie lee el cuaderno de obra peruano ni mide los plazos de respuesta. Esa es la brecha concreta que cubrimos.");

// 6 Objetivo e hipótesis
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Brecha y objetivo" });
s.addText("Objetivo e hipótesis", { placeholder: "title" });
texto(s, "Desarrollar y evaluar un sistema con IA que lea el cuaderno de obra digital de Arequipa para medir el cumplimiento de los plazos de respuesta a consultas y anticipar con 60 días el atraso legal.",
  { x: 0.6, y: 1.5, w: 12.1, h: 1.2, fontSize: 20, bold: true });
tarjeta(s, 0.6, 3.0, 3.9, 3.6, "H1 · Emparejador", "La IA elige la consulta que se responde mejor que la regla «la más reciente».", SELLO, "h1");
tarjeta(s, 4.7, 3.0, 3.9, 3.6, "H2 · Predictor", "El sistema ordena las obras por riesgo mejor que el azar y que una regla simple.", ALTO, "h2");
tarjeta(s, 8.8, 3.0, 3.9, 3.6, "H3 · Valor de las consultas", "Medir las consultas y sus plazos mejora la predicción frente al mismo modelo sin ellas.", BAJO, "h3");
s.addNotes("Un objetivo general medible y tres hipótesis que se pueden contrastar con datos. Al final mostraremos cuáles se cumplen y cuáles no del todo.");

// 7 La solución
pres.addSection({ title: "Solución" });
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Solución" });
s.addText("La solución: tres preguntas por obra", { placeholder: "title" });
tarjeta(s, 0.6, 1.5, 3.9, 4.0, "¿Se va a atrasar?", "Probabilidad de caer en atraso legal en 60 días, con su nivel (alto, medio, bajo) y las razones en palabras simples.", ALTO, "q-atraso");
tarjeta(s, 4.7, 1.5, 3.9, 4.0, "¿Quién la está trabando?", "Cada consulta del residente: a tiempo, tarde o sin respuesta en el cuaderno, y quién debía responder según la ley.", MEDIO, "q-quien");
tarjeta(s, 8.8, 1.5, 3.9, 4.0, "¿Qué está pasando?", "Actividad del cuaderno por mes y los hechos formales: suspensiones, ampliaciones, adicionales, riesgos.", SELLO, "q-que");
texto(s, "Prueba escrita: cada afirmación muestra el asiento original del cuaderno (texto anonimizado).", { x: 0.6, y: 5.8, w: 12.1, h: 0.6, fontSize: 18, bold: true, color: SELLO });
s.addNotes("El sistema responde tres preguntas que cualquier supervisor entiende. Lo que lo diferencia es que nunca da una conclusión sin mostrar el asiento del cuaderno que la respalda.");

// 8 Arquitectura
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Solución" });
s.addText("Arquitectura: cinco capas, costo cero", { placeholder: "title" });
imagen(s, "d03b_arquitectura_horizontal.png", 0.6, 1.4, 12.1, 3.3, "arquitectura");
texto(s, [
  { text: "Fuente: ", options: { bold: true } }, { text: "datos abiertos del OECE (CSV mensual).", options: { breakLine: true } },
  { text: "Ingesta: ", options: { bold: true } }, { text: "Python, DuckDB y Parquet.", options: { breakLine: true } },
  { text: "Inteligencia: ", options: { bold: true } }, { text: "emparejador (IA), motor de plazos (reglas legales) y predictor (IA).", options: { breakLine: true } },
  { text: "Publicación: ", options: { bold: true } }, { text: "archivos JSON pequeños.", options: { breakLine: true } },
  { text: "Presentación: ", options: { bold: true } }, { text: "sitio web estático en GitHub Pages.", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "Sin servidor ni base de datos en línea: menos costo y casi ninguna superficie de ataque.", options: { color: SELLO, bold: true } },
], { x: 0.6, y: 4.85, w: 12.1, h: 1.95, fontSize: 15, paraSpaceAfter: 2 });
s.addNotes("La arquitectura es deliberadamente simple. Todo el cálculo pesado se hace una vez al mes; la web solo lee archivos. Por eso el costo de operación es cero y no hay datos de usuarios que proteger.");

// 9 Datos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Solución" });
s.addText("Los datos: de dónde salen y cómo se verifican", { placeholder: "title" });
const fila = (a, b, c2, d) => [a, b, c2, d].map((t) => ({ text: t, options: { fontSize: 14, color: TINTA } }));
const cab = ["Qué", "Arequipa", "Perú", "Cómo se verifica"].map((t) => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: TINTA }, fontSize: 14 } }));
s.addTable([cab,
  fila("Cuadernos con asientos", n(P1.arequipa.cuadernos), n(P1.nacional.cuadernos), "Archivos oficiales del OECE con huella SHA-256"),
  fila("Asientos (jun-2024 a ago-2026)", n(P1.arequipa.asientos), n(P1.nacional.asientos), "Scripts públicos, mismo resultado al reejecutar"),
  fila("Consultas del residente", n(P1.arequipa.consultas_residente), n(P1.nacional.consultas_residente), "Tipo oficial del asiento y rol del autor"),
  fila("Respuestas a consultas", n(P1.arequipa.respuestas), n(P1.nacional.respuestas), "97 % de los números citados existen en el cuaderno"),
  fila("Plazos legales", "5 y 21 días", "5 y 21 días", "Texto del RLCE (art. 193) y del RLGCP (art. 190)"),
], { x: 0.6, y: 1.5, w: 12.1, colW: [3.2, 1.8, 1.8, 5.3], border: { type: "solid", color: "D5DBE1", pt: 1 }, rowH: 0.55, objectName: "tabla-datos" });
texto(s, "¿Por qué el cuaderno y no INFOBRAS? INFOBRAS es una foto sin historia; el cuaderno es oficial, fechado, diario, obligatorio y abierto.", { x: 0.6, y: 5.3, w: 12.1, h: 1.0, fontSize: 18, bold: true, color: SELLO });
s.addNotes("Esta diapositiva responde a «¿qué datos usaron y son verificados?». Todo sale de datos abiertos del Estado; cada archivo tiene su huella digital y los scripts están publicados.");

// 10 Emparejador
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Solución" });
s.addText("Componente IA 1: unir cada respuesta con su consulta", { placeholder: "title" });
imagen(s, "d05_emparejador.png", 0.6, 1.4, 12.1, 3.6, "flujo-emparejador");
texto(s, [
  { text: "Primero reglas: ", options: { bold: true } }, { text: "si la respuesta cita «asiento N.° 157» o «consulta N.° 14», el enlace es directo.", options: { breakLine: true } },
  { text: "Si no cita nada, IA: ", options: { bold: true } }, { text: "Sentence-BERT compara el significado de los textos y LightGBM elige la consulta más probable, solo si la confianza es alta.", options: {} },
], { x: 0.6, y: 5.25, w: 12.1, h: 1.4, fontSize: 17, paraSpaceAfter: 6 });
s.addNotes("La IA no reemplaza a las reglas: entra solo cuando la respuesta no cita la consulta. Y para no inventar enlaces, solo acepta los de confianza alta, fijada para tener 90 % de precisión.");

// 11 Motor de plazos
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Solución" });
s.addText("Componente 2: el motor de plazos aplica la ley", { placeholder: "title" });
imagen(s, "d06_motor_plazos.png", 0.6, 1.4, 12.1, 3.7, "flujo-plazos");
texto(s, "5 días calendario si responde el supervisor (RLCE 193.3); 21 si interviene la entidad y el proyectista (4+2+10+5 en el RLCE; 5+1+10+5 en el RLGCP). Si no hay respuesta en el cuaderno, se dice exactamente eso: «sin respuesta en el cuaderno».",
  { x: 0.6, y: 5.3, w: 12.1, h: 1.3, fontSize: 17 });
s.addNotes("Esta parte no usa IA: son reglas tomadas del reglamento. Es importante porque el plazo no es una opinión nuestra, es la ley. Y somos cuidadosos con el lenguaje: no decimos que no se respondió, decimos que no está en el cuaderno.");

// 12 Evaluación
pres.addSection({ title: "Evaluación" });
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Evaluación" });
s.addText("Cómo lo probamos: sin ver el futuro", { placeholder: "title" });
imagen(s, "g01_particion_temporal.png", 0.6, 1.4, 12.1, 3.3, "particion");
texto(s, [
  { text: "Predictor: ", options: { bold: true } }, { text: "aprende hasta septiembre de 2025, se ajusta con octubre a diciembre y se prueba una sola vez de enero a junio de 2026.", options: { breakLine: true } },
  { text: "Emparejador: ", options: { bold: true } }, { text: "se borra el número citado en las respuestas y el sistema debe adivinar la consulta; aprende del país y se prueba en Arequipa.", options: {} },
], { x: 0.6, y: 4.95, w: 12.1, h: 1.6, fontSize: 17, paraSpaceAfter: 6 });
s.addNotes("Respuesta a «¿cómo saben que no hizo trampa?». El modelo nunca ve los meses de prueba. Y el emparejador se prueba con respuestas cuya solución conocemos porque citan el número, pero ese número se borra.");

// 13 Métricas
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Evaluación" });
s.addText("Las métricas y por qué esas", { placeholder: "title" });
const cab2 = ["Métrica", "Pregunta que responde", "Por qué"].map((t) => ({ text: t, options: { bold: true, color: BLANCO, fill: { color: TINTA }, fontSize: 14 } }));
const f2 = (a, b, c2) => [a, b, c2].map((t, i) => ({ text: t, options: { fontSize: 14, color: TINTA, bold: i === 0 } }));
s.addTable([cab2,
  f2("PR-AUC (principal)", "¿Pone primero a las obras que sí se atrasan?", `El atraso es raro (${pc(AQ.prevalencia)}); la exactitud engaña`),
  f2("Precisión en el 20 % superior", "Si reviso 1 de cada 5 obras, ¿cuántas tenían el problema?", "Es la capacidad real de revisión"),
  f2("Exhaustividad en el 20 %", "¿Qué parte de los atrasos encuentro?", "Mide cuánto problema se cubre"),
  f2("Calibración (Brier)", "Si dice 10 %, ¿pasa un 10 %?", "Para poder creer la probabilidad"),
  f2("Anticipación", "¿Con cuántos días de ventaja avisa?", "Es el propósito de una alerta"),
  f2("Exactitud del emparejador", "¿Elige la consulta correcta?", "Es su tarea directa"),
], { x: 0.6, y: 1.5, w: 12.1, colW: [3.1, 4.9, 4.1], border: { type: "solid", color: "D5DBE1", pt: 1 }, rowH: 0.55, objectName: "tabla-metricas" });
texto(s, `No usamos la exactitud: diciendo siempre «no se atrasa» se acertaría ${pc(1 - AQ.prevalencia)} y no serviría para nada.`, { x: 0.6, y: 5.75, w: 12.1, h: 0.8, fontSize: 18, bold: true, color: ALTO });
s.addNotes("La pregunta que nos hicieron la vez pasada. Cada métrica responde una pregunta concreta de quien revisa obras. La exactitud la descartamos por una razón simple: con un evento tan raro, un sistema inútil sacaría 93 %.");

// 14 Resultado emparejador (gráfico nativo)
pres.addSection({ title: "Resultados" });
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText(`Resultado 1: la IA acierta la consulta en ${pc(E.modelo_ia)}`, { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Exactitud", labels: ["Elegir al azar", "Solo similitud de texto", "Regla: la más reciente", "IA (Caja Negra)"],
  values: [E.azar, E.solo_similitud_texto, E.regla_mas_reciente, E.modelo_ia].map((v) => Math.round(1000 * v) / 10) }],
  { x: 0.6, y: 1.5, w: 7.6, h: 5.0, barDir: "bar", chartColors: ["9AA7B4", "9AA7B4", "9AA7B4", SELLO], valAxisMaxVal: 80, valAxisMinVal: 0,
    dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"', dataLabelPosition: "outEnd", ...ejes, objectName: "grafico-emparejador" });
texto(s, [
  { text: `${n(E.respuestas)} respuestas de Arequipa`, options: { bold: true, breakLine: true } },
  { text: "con el número citado borrado.", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: `IC 95 %: ${pc(E.modelo_ia_ic95[0])} a ${pc(E.modelo_ia_ic95[1])}.`, options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: `Con umbral de confianza: ${pc(E.precision_con_umbral)} de precisión.`, options: { bold: true, color: SELLO, breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "El significado solo no basta: muchas consultas de una obra tratan lo mismo. Funciona cuando se combina con el contexto.", options: { color: GRIS } },
], { x: 8.6, y: 1.7, w: 4.1, h: 4.8, fontSize: 16 });
s.addNotes("H1 se cumple: 66,8 % frente a 52 % de la mejor regla. Un dato interesante: la similitud de texto sola rinde menos que la regla, porque dentro de una obra las consultas se parecen. La IA gana cuando combina significado y contexto.");

// 15 Resultado consultas
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText(`Resultado 2: ${n(100 * QA.veredicto["Sin respuesta en el cuaderno"] / QA.consultas_residente)} % de las consultas no tiene respuesta en el cuaderno`, { placeholder: "title" });
imagen(s, "g03_estado_consultas.png", 0.6, 1.5, 12.1, 2.0, "estado-consultas");
dato(s, 0.6, 3.9, 3.9, `${n(QA.dias_respuesta.mediana)} días`, "mediana de respuesta cuando sí hay respuesta", BAJO, "dato-mediana");
dato(s, 4.7, 3.9, 3.9, `${n(QA.dias_respuesta.p90)} días`, "o más tarda el 10 % más lento", MEDIO, "dato-p90");
dato(s, 8.8, 3.9, 3.9, `${n(QA.pct_tarde_entre_respondidas, 1)} %`, "de las respuestas llegó fuera del plazo legal", ALTO, "dato-tarde2");
s.addNotes("Este es el hallazgo de gestión más fuerte. De 6 472 consultas del residente en Arequipa, solo 37 % tienen respuesta enlazada en el cuaderno. Las que sí la tienen se responden rápido en la mediana, pero un 19 % llega tarde.");

// 16 Resultado predictor
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText("Resultado 3: el 20 % marcado concentra la mitad de los atrasos", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Precisión en el 20 % superior", labels: ["Revisión al azar", "Regla: consultas vencidas", "Regresión logística", "LightGBM sin consultas", "Caja Negra"],
  values: [AQ.prevalencia, B("B1 Regla: consultas vencidas").precision_top20, B("B2 Regresión logística").precision_top20, B("B3 LightGBM sin consultas").precision_top20, M.precision_top20].map((v) => Math.round(1000 * v) / 10) }],
  { x: 0.6, y: 1.5, w: 7.6, h: 5.0, barDir: "bar", chartColors: ["9AA7B4", "9AA7B4", "9AA7B4", "9AA7B4", ALTO], valAxisMinVal: 0, valAxisMaxVal: 25,
    dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"', dataLabelPosition: "outEnd", showTitle: true, title: "Obras revisadas que sí se atrasaron (Arequipa, ene–jun 2026)",
    titleFontSize: 13, titleColor: GRIS, titleFontFace: "+mn-lt", ...ejes, objectName: "grafico-predictor" });
dato(s, 8.6, 1.5, 4.1, `${n(M.lift_top20, 1)} veces`, "más eficaz que revisar al azar con el mismo esfuerzo", ALTO, "dato-lift");
dato(s, 8.6, 4.0, 4.1, pc(M.recall_top20, 0), `de los atrasos están en ese 20 % (PR-AUC ${n(M.pr_auc, 3)})`, SELLO, "dato-recall");
s.addNotes(`H2 se cumple frente al azar. Frente a la regla simple, la ventaja es clara en el país pero en Arequipa no es concluyente: solo hubo ${AQ.positivos} atrasos en la prueba. Lo decimos tal cual.`);

// 17 Niveles y anticipación
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Resultados" });
s.addText(`Los niveles separan el riesgo y el aviso llega ${n(ANT.dias_anticipacion_mediana)} días antes`, { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Atraso observado", labels: ["Riesgo bajo", "Riesgo medio", "Riesgo alto"],
  values: [NIV.BAJO, NIV.MEDIO, NIV.ALTO].map((x) => Math.round(1000 * x.tasa_observada) / 10) }],
  { x: 0.6, y: 1.5, w: 6.6, h: 5.0, barDir: "col", chartColors: [BAJO, MEDIO, ALTO], valAxisMinVal: 0, valAxisMaxVal: 20,
    dataLabelFormatCode: '0.0" %"', valAxisLabelFormatCode: '0" %"', dataLabelPosition: "outEnd", showTitle: true, title: "Obras-mes que cayeron en atraso en 60 días, por nivel",
    titleFontSize: 13, titleColor: GRIS, titleFontFace: "+mn-lt", ...ejes, objectName: "grafico-niveles" });
dato(s, 7.6, 1.5, 5.1, `${n(ANT.pct_alertadas, 0)} %`, `de las obras que se atrasaron tuvo antes una alerta alta (${ANT.alertadas_antes} de ${ANT.obras_con_evento})`, ALTO, "dato-alertadas");
dato(s, 7.6, 4.0, 5.1, `${n(ANT.dias_anticipacion_mediana)} días`, "de anticipación (mediana): tiempo para destrabar la consulta", SELLO, "dato-anticipacion");
s.addNotes("Las obras de nivel alto se atrasaron diez veces más que las de nivel bajo. Y en más de la mitad de los atrasos, el sistema avisó antes, con una mediana de 39 días: tiempo suficiente para exigir una respuesta pendiente.");

// 18 Prototipo
pres.addSection({ title: "Prototipo y cierre" });
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Prototipo y cierre" });
s.addText("El prototipo: simple, rápido y con la prueba a la vista", { placeholder: "title" });
imagen(s, "c01_lista.png", 0.6, 1.4, 6.0, 4.6, "captura-lista");
imagen(s, "c03_quien_traba.png", 6.9, 1.4, 5.8, 4.6, "captura-ficha");
texto(s, `${n(RES.obras)} obras en ejecución · ${RES.por_nivel.ALTO} de riesgo alto · la lista carga en ~0,5 s · sin datos personales · owerlopez.github.io/caja-negra-obras`,
  { x: 0.6, y: 6.2, w: 12.1, h: 0.5, fontSize: 15, color: GRIS });
s.addNotes("Aquí hacemos la demo de dos minutos: abrir la lista, elegir una obra de riesgo alto, ver por qué está en riesgo, abrir una consulta vencida y mostrar el asiento original como prueba.");

// 19 Límites
s = pres.addSlide({ masterName: "CONTENIDO", sectionTitle: "Prototipo y cierre" });
s.addText("Lo que no hace y sus límites (lo decimos nosotros)", { placeholder: "title" });
tarjeta(s, 0.6, 1.5, 5.9, 5.1, "No hace", "No acusa ni sanciona: da una prioridad de revisión.\n\nNo reemplaza al supervisor ni al control.\n\nNo ve las respuestas enviadas por carta.", GRIS, "no-hace");
tarjeta(s, 6.8, 1.5, 5.9, 5.1, "Límites", "Predice el atraso legal (menor al 80 %), no la paralización.\n\nSolo obras por contrata con cuaderno digital, desde jun-2024.\n\nPocos casos en Arequipa: algunos intervalos son amplios.\n\nFalta la prueba con usuarios reales (SUS).", MEDIO, "limites");
s.addNotes("Mejor decir los límites nosotros antes que el jurado. Ninguno invalida el resultado, pero delimitan lo que se puede afirmar.");

// 20 Conclusiones
s = pres.addSlide({ masterName: "MENSAJE", sectionTitle: "Prototipo y cierre" });
s.addText("Conclusiones", { placeholder: "title" });
texto(s, [
  { text: `Se puede reconstruir con IA el enlace consulta–respuesta que los datos oficiales no publican: ${pc(E.modelo_ia)} de acierto.`, options: { bullet: { type: "number" }, breakLine: true } },
  { text: `Las respuestas son poco trazables: solo ${n(QA.pct_respondidas_enlazadas, 0)} % aparece en el cuaderno y ${n(QA.pct_tarde_entre_respondidas, 0)} % de las registradas llega tarde.`, options: { bullet: { type: "number" }, breakLine: true } },
  { text: `Leer el cuaderno permite anticipar el atraso: ${n(M.lift_top20, 1)} veces más eficaz que el azar y ${n(ANT.dias_anticipacion_mediana)} días de aviso.`, options: { bullet: { type: "number" }, breakLine: true } },
  { text: "Todo con datos abiertos, costo cero y un prototipo desplegado.", options: { bullet: { type: "number" } } },
], { x: 0.6, y: 1.6, w: 12.1, h: 4.8, fontSize: 22, color: BLANCO, paraSpaceAfter: 18 });
s.addNotes("Cerramos respondiendo a cada objetivo con un número. La idea a recordar: el Estado ya publica la caja negra de cada obra; nosotros la leemos a tiempo.");

const salida = path.join(RAIZ, "diapositivas", "Caja_Negra_de_Obra.pptx");
pres.writeFile({ fileName: salida }).then(async () => {
  const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");
  await applyTheme(salida, THEME);
  console.log("ok", salida);
});
