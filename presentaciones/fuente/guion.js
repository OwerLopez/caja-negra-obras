// Construye el guion de exposición (.docx) de una presentación a partir de un archivo de configuración.
// La explicación oral de cada diapositiva es la nota del orador de la propia presentación (notas JSON),
// para que guion y diapositivas digan lo mismo.
// Uso: NODE_PATH=<carpeta con docx> node presentaciones/fuente/guion.js <configuración.json>
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  Footer, PageNumber, LevelFormat, TableLayoutType } = require("docx");

const RAIZ = path.resolve(__dirname, "..", "..");
const CFG = JSON.parse(fs.readFileSync(path.resolve(process.argv[2] ?? path.join(__dirname, "guion_exposicion.json")), "utf8"));
const NOTAS = JSON.parse(fs.readFileSync(path.join(RAIZ, CFG.notas), "utf8"));
const FUENTE = "Calibri";
const r = (text, o = {}) => new TextRun({ text, font: FUENTE, ...o });
const p = (t, o = {}) => new Paragraph({ children: Array.isArray(t) ? t : [r(t)], spacing: { after: 100, line: 290 }, ...o });
const h = (t, nivel) => new Paragraph({ heading: nivel, children: [r(t)], spacing: { before: 240, after: 120 } });
const vi = (t) => new Paragraph({ children: [r(t)], numbering: { reference: "vinetas", level: 0 }, spacing: { after: 60, line: 280 } });
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const tiempo = (d) => CFG.tiempos[String(d)] ?? 0;
const tiempoBloque = (b) => b.diapositivas.reduce((a, d) => a + tiempo(d), 0);
const total = CFG.bloques.reduce((a, b) => a + tiempoBloque(b), 0);

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
C.push(new Paragraph({ spacing: { after: 80 }, children: [r("Caja Negra de Obra", { bold: true, size: 40, color: "1B2A3A", font: "Cambria" })] }));
C.push(p([r(CFG.subtitulo, { size: 26, color: "2B4C9B" })]));
C.push(p(`Presentación: ${CFG.presentacion} (${NOTAS.length} diapositivas). Duración estimada: ${mmss(total)} minutos, más preguntas. ${CFG.introduccion}`));
C.push(h("Distribución", HeadingLevel.HEADING_1));
C.push(tabla(["Bloque", "Diapositivas", "Tiempo", "Integrante (completar)"],
  CFG.bloques.map((b) => [b.nombre, b.diapositivas.join(", "), mmss(tiempoBloque(b)), ""]), [4.4, 1.8, 0.9, 2.3]));
if (CFG.fuera_de_tiempo) C.push(p([r("Fuera del tiempo: ", { bold: true }), r(CFG.fuera_de_tiempo)]));
C.push(h("Antes de empezar", HeadingLevel.HEADING_2));
CFG.antes.forEach((t) => C.push(vi(t)));

for (const b of CFG.bloques) {
  C.push(h(b.nombre, HeadingLevel.HEADING_1));
  C.push(p([r("Qué debe lograr este bloque: ", { bold: true }), r(b.enfoque)]));
  C.push(p([r("Tiempo del bloque: ", { bold: true }), r(mmss(tiempoBloque(b)))]));
  for (const d of b.diapositivas) {
    const nota = NOTAS.find((x) => x.n === d);
    C.push(h(`Diapositiva ${d} · ${nota.titulo} (${mmss(tiempo(d))})`, HeadingLevel.HEADING_2));
    C.push(p(nota.notas || "Diapositiva de transición: leer el título y pasar a la siguiente."));
    const claves = CFG.cifras?.[String(d)];
    if (claves) C.push(p([r("Cifras que deben decirse exactas: ", { bold: true }), r(claves)]));
    if (d === CFG.demo.diapositiva) {
      C.push(p([r("Demostración en vivo:", { bold: true })]));
      CFG.demo.pasos.forEach((t) => C.push(vi(t)));
    }
  }
  C.push(p([r("Transición: ", { bold: true, color: "2B4C9B" }), r(b.transicion, { italics: true })]));
}

C.push(h("Preguntas probables y quién responde", HeadingLevel.HEADING_1));
C.push(tabla(["Pregunta", "Respuesta breve", "Bloque"], CFG.preguntas, [3.2, 5.0, 1.0]));

const doc = new Document({
  creator: "Ower Frank López", title: `Guion · ${CFG.presentacion}`,
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
const salida = path.join(RAIZ, CFG.salida);
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(salida, b); console.log("ok", salida, mmss(total)); });
