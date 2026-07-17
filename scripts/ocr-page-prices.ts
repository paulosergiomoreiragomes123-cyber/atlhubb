import fs from "node:fs";
import { renderPageAsImage, getDocumentProxy } from "unpdf";
import { createWorker } from "tesseract.js";

// Ferramenta de apoio pro mapeamento manual único de uma edição (ver
// src/modules/magazine/editions/) — roda OCR numa página da revista
// oficial, acha candidatos a preço com bounding box, e salva a imagem
// renderizada pra eu conferir visualmente qual produto cada preço
// pertence. Não faz parte do app — é só uma ferramenta de autoria, usada
// uma vez por página, por edição.
//
// Uso: npx tsx scripts/ocr-page-prices.ts <pdfPath> <pageNumber> <outDir>

const PRICE_PATTERN = /\d{1,3}[,.]\d{2}/;

async function main() {
  const pdfPath = process.argv[2];
  const pageNumber = Number(process.argv[3]);
  const outDir = process.argv[4];
  const scale = 2;

  const buffer = fs.readFileSync(pdfPath);
  const image = await renderPageAsImage(new Uint8Array(buffer), pageNumber, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale,
  });
  fs.writeFileSync(`${outDir}/page-${pageNumber}.png`, Buffer.from(image));

  const worker = await createWorker("por");
  const result = await worker.recognize(Buffer.from(image), {}, { blocks: true });
  await worker.terminate();

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const imgWidth = viewport.width;
  const imgHeight = viewport.height;

  const words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }[] = [];
  for (const block of result.data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push(word);
        }
      }
    }
  }

  const priceWords = words.filter((w) => PRICE_PATTERN.test(w.text));
  const candidates = priceWords.map((w) => {
    const match = w.text.match(PRICE_PATTERN)![0];
    return {
      text: w.text,
      matchedPrice: match,
      confidence: w.confidence,
      xFrac: +(w.bbox.x0 / imgWidth).toFixed(4),
      yFrac: +(w.bbox.y0 / imgHeight).toFixed(4),
      widthFrac: +((w.bbox.x1 - w.bbox.x0) / imgWidth).toFixed(4),
      heightFrac: +((w.bbox.y1 - w.bbox.y0) / imgHeight).toFixed(4),
    };
  });

  console.log(`Page ${pageNumber} (${imgWidth.toFixed(0)}x${imgHeight.toFixed(0)} at scale ${scale}):`);
  console.log(JSON.stringify(candidates, null, 1));
  fs.writeFileSync(`${outDir}/page-${pageNumber}-prices.json`, JSON.stringify(candidates, null, 1));
}

main();
