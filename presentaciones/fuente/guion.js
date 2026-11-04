// Construye presentaciones/Guion_Exposicion.docx: distribución en cinco bloques, tiempos, explicación oral y transiciones.
// La explicación oral de cada diapositiva es la nota del orador de la presentación (fuente/notas.json), para que no se contradigan.
// Uso: NODE_PATH=<carpeta con docx> node presentaciones/fuente/guion.js
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  Footer, PageNumber, LevelFormat, TableLayoutType } = require("docx");

const CARPETA = path.resolve(__dirname, "..");
const NOTAS = JSON.parse(fs.readFileSync(path.join(__dirname, "notas.json"), "utf8"));
const FUENTE = "Calibri";
const r = (text, o = {}) => new TextRun({ text, font: FUENTE, ...o });
const p = (t, o = {}) => new Paragraph({ children: Array.isArray(t) ? t : [r(t)], spacing: { after: 100, line: 290 }, ...o });
const h = (t, nivel) => new Paragraph({ heading: nivel, children: [r(t)], spacing: { before: 240, after: 120 } });
const vi = (t) => new Paragraph({ children: [r(t)], numbering: { reference: "vinetas", level: 0 }, spacing: { after: 60, line: 280 } });

// tiempo en segundos por diapositiva (suma ~20 minutos)
const TIEMPO = { 1: 30, 2: 90, 3: 90, 4: 60, 5: 75, 6: 75, 7: 60, 8: 60, 9: 60, 10: 75, 11: 75, 12: 90, 13: 90, 14: 60, 15: 60, 16: 120, 17: 60 };
const BLOQUES = [
  { nombre: "Bloque 1 · Contexto y problema", diapos: [1, 2, 3], enfoque: "Presenta el proyecto, el origen oficial del problema y el árbol de problemas con las dos cifras que medimos.",
    transicion: "«Con el problema claro, mi compañero explica qué investigamos, qué propusimos y con qué datos trabajamos.»" },
  { nombre: "Bloque 2 · Investigación, propuesta, factores y datos", diapos: [4, 5, 6, 7], enfoque: "Explica la brecha encontrada en los antecedentes, la propuesta y su alcance, los 53 indicadores con sus criterios de selección y la calidad de las fuentes.",
    transicion: "«Ya sabemos qué datos usamos; ahora mi compañero explica cómo los procesamos y con qué métricas medimos todo.»" },
  { nombre: "Bloque 3 · Metodología, procesamiento y métricas", diapos: [8, 9, 10, 11], enfoque: "Explica la metodología, el pipeline con sus controles de calidad y, con detalle, cada medida y métrica: fórmula, unidad, interpretación y criterio.",
    transicion: "«Con las métricas definidas, mi compañero muestra cómo funciona el modelo, qué resultados obtuvo y cómo se integra en la arquitectura.»" },
  { nombre: "Bloque 4 · Modelo, evaluación y arquitectura", diapos: [12, 13, 14], enfoque: "Explica el modelo de ML con sus fórmulas, la evaluación fuera de tiempo con resultados honestos y la responsabilidad de cada pieza de la arquitectura.",
    transicion: "«Para cerrar, mi compañero recorre el flujo completo y lo demuestra en el sistema publicado.»" },
  { nombre: "Bloque 5 · Flujo integral, demostración y conclusiones", diapos: [15, 16, 17], enfoque: "Recorre el flujo de punta a punta, hace la demostración en vivo y cierra separando lo implementado, lo validado y lo planificado.",
    transicion: "Cierre: agradecer y abrir la ronda de preguntas. Cualquier integrante responde según su bloque." },
];
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const total = Object.values(TIEMPO).reduce((a, b) => a + b, 0);

const ANCHO = 9026;
function tabla(cab, filas, prop) {
  const suma = prop.reduce((a, b) => a + b, 0);
  const anchos = prop.map((x) => Math.floor((x / suma) * ANCHO));
  anchos[anchos.length - 1] += ANCHO - anchos.reduce((a, b) => a + b, 0);
  const borde = { style: BorderStyle.SINGLE, size: 4, color: "C9D1D9" };
  const celda = (t, i, esCab) => new TableCell({ width: { size: anchos[i], type: WidthType.DXA }, borders: { top: borde, bottom: borde, left: borde, right: borde },
    shading: esCab ? { type: ShadingType.CLEAR, fill: "1B2A3A", color: "auto" } : undefined, margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [r(String(t), esCab ? { bold: true, color: "FFFFFF", size: 19 } : { size: 19 })] })] });
  return new Table({ width: { size: ANCHO, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: anchos,
    rows: [new TableRow({ tableHeader: true, children: cab.map((c, i) => celda(c, i, true)) }), ...filas.map((f) => new TableRow({ children: f.map((c, i) => celda(c, i, false)) }))] });
}

const C = [];
C.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 80 }, children: [r("Caja Negra de Obra", { bold: true, size: 40, color: "1B2A3A", font: "Cambria" })] }));
C.push(p([r("Guion de exposición para cinco integrantes", { size: 26, color: "2B4C9B" })]));
C.push(p(`Presentación: Caja_Negra_de_Obra_Exposicion.pptx (17 diapositivas). Duración estimada: ${mmss(total)} minutos, más preguntas. Cada bloque dura entre 3 y 5 minutos y cubre contenido técnico propio; la demostración va al final, dentro del bloque 5. Las diapositivas no llevan nombres: asignen cada bloque a un integrante en la tabla.`));
C.push(h("Distribución", HeadingLevel.HEADING_1));
C.push(tabla(["Bloque", "Diapositivas", "Tiempo", "Integrante (completar)"],
  BLOQUES.map((b) => [b.nombre, b.diapos.join(", "), mmss(b.diapos.reduce((a, d) => a + TIEMPO[d], 0)), ""]), [4.4, 1.6, 1.0, 2.4]));
C.push(p(" "));
C.push(h("Antes de empezar", HeadingLevel.HEADING_2));
[
  "Abrir el sitio publicado (owerlopez.github.io/caja-negra-obras) en una pestaña aparte antes de la exposición, para la demostración del bloque 5.",
  "Si falla internet, usar las capturas de la diapositiva 16, que son del sistema real con el corte del 31 de agosto de 2026.",
  "Todas las cifras salen de los archivos de resultados del proyecto; no redondear ni cambiar valores al hablar.",
  "Regla de lenguaje: decir «prioridad de revisión», nunca «obra culpable»; decir «sin respuesta en el cuaderno», no «no respondida».",
].forEach((t) => C.push(vi(t)));

for (const b of BLOQUES) {
  C.push(h(b.nombre, HeadingLevel.HEADING_1));
  C.push(p([r("Qué debe lograr este bloque: ", { bold: true }), r(b.enfoque)]));
  C.push(p([r("Tiempo del bloque: ", { bold: true }), r(mmss(b.diapos.reduce((a, d) => a + TIEMPO[d], 0)))]));
  for (const d of b.diapos) {
    const nota = NOTAS.find((x) => x.n === d);
    C.push(h(`Diapositiva ${d} · ${nota.titulo} (${mmss(TIEMPO[d])})`, HeadingLevel.HEADING_2));
    C.push(p(nota.notas));
    if (d === 16) {
      C.push(p([r("Recorrido de la demostración en vivo:", { bold: true })]));
      [
        "Entrada: en el pie de página del sitio, mostrar el corte (31 de agosto de 2026) y la huella del modelo.",
        "Procesamiento: abrir «Cómo predice», sección «Los indicadores», y buscar «plazo» para mostrar que cada indicador tiene fórmula y fuente.",
        "Modelo ML: volver a Panorama y abrir la obra de mayor riesgo; leer su probabilidad y las tres razones principales.",
        "Resultado: en Panorama, filtrar «Alto» y activar «Solo con consultas vencidas».",
        "Visualización: en la ficha, pestaña «Consultas», abrir una consulta vencida y leer el asiento original como prueba.",
        "Opcional (30 s): pulsar «Recorrido guiado» para mostrar cómo la web se explica sola a quien no conoce el tema.",
      ].forEach((t) => C.push(vi(t)));
    }
  }
  C.push(p([r("Transición: ", { bold: true, color: "2B4C9B" }), r(b.transicion, { italics: true })]));
}

C.push(h("Preguntas probables y quién responde", HeadingLevel.HEADING_1));
C.push(tabla(["Pregunta", "Respuesta breve", "Bloque"], [
  ["¿Por qué PR-AUC y no exactitud?", "Porque el atraso es raro (7 % en Arequipa): decir siempre «no se atrasa» acertaría 93 % y no serviría.", "3"],
  ["¿El modelo vio el futuro?", "No: cada indicador usa solo datos con fecha anterior al cierre; se entrenó hasta septiembre de 2025 y se probó de enero a junio de 2026.", "3 y 4"],
  ["¿Por qué no eligieron el modelo que salió mejor en Arequipa?", "Porque el modelo se elige con la validación, antes de mirar la prueba; cambiarlo después sería hacer trampa.", "4"],
  ["¿Cómo saben que el emparejador acierta sin etiquetar a mano?", "Usamos respuestas que citan el número de la consulta, borramos ese número y le pedimos al sistema que la adivine.", "3"],
  ["¿Dónde está la base de datos?", "No hay servidor en línea: los datos se guardan en Parquet, se consultan con DuckDB en el pipeline y se publican como JSON con contrato.", "4"],
  ["¿Qué falta?", "La prueba de uso con supervisores reales (SUS) y que el OECE publique el identificador de asiento.", "5"],
], [3.2, 5.0, 1.0]));

const doc = new Document({
  creator: "Ower Frank López", title: "Guion de exposición · Caja Negra de Obra",
  styles: { default: { document: { run: { font: FUENTE, size: 21, color: "1F2933" } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "1B2A3A", font: "Cambria" }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: "2B4C9B", font: FUENTE }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 1 } },
    ] },
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [r("Guion · Caja Negra de Obra · página ", { size: 16, color: "56677A" }), new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 16, color: "56677A" })] })] }) },
    children: C }],
});
const salida = path.join(CARPETA, "Guion_Exposicion.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(salida, b); console.log("ok", salida, mmss(total)); });
