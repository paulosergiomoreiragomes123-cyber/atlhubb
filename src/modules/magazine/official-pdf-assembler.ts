import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { renderPageAsImage } from "unpdf";
import { createCanvas, loadImage, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import { buildEnrichmentBySku, type ProductSnapshotItem } from "@/src/modules/magazine/generator";
import { getActiveEdition } from "@/src/modules/magazine/editions/registry";
import { getCoverPdfColor } from "@/src/modules/magazine/cover-colors";
import { buildWhatsappLink } from "@/src/lib/whatsapp";
import { formatCents } from "@/src/lib/currency";
import type { ConsultantInfo } from "@/src/modules/magazine/consultant-info";

const DEFAULT_MAGAZINE_MESSAGE = "Olá! Vi sua revista digital e gostaria de saber mais.";

// O PDF oficial é 100% imagem achatada (0 texto real, confirmado — ver
// PROJECT.md) — por isso desenhar por cima de uma página COPIADA
// (`copyPages` + `page.drawText/drawRectangle`) é ambíguo entre leitores de
// PDF: testado ao vivo, o conteúdo novo ficava ATRÁS do original em alguns
// renderizadores (pdf.js) mesmo com os operadores na ordem certa dentro do
// arquivo — um problema conhecido de interoperabilidade com Contents
// multi-stream + wrap de graphics state que o próprio pdf-lib insere ao
// desenhar numa página copiada. Como não existe conteúdo vetorial pra
// preservar (é tudo bitmap), a solução robusta é: renderizar a página
// original como imagem (mesma técnica já usada pro OCR do mapeamento),
// desenhar a sobreposição DIRETO no canvas (ordem de pintura inequívoca,
// sempre por cima) e embutir o resultado como uma imagem de página única —
// sem ambiguidade de Contents/z-order em lugar nenhum.
//
// 1.8, não 2.5: medido ao vivo (produção, 44 páginas com overlay) — 2.5
// levava ~72s por PDF, tempo suficiente pra um consultor achar que a
// página travou e desistir antes do <iframe> carregar (aconteceu de
// verdade, ver PROJECT.md). 1.8 corta ~43% do tempo (140s→80s medido em
// dev, proporção deve valer em produção) sem perda perceptível de
// nitidez pra leitura em tela — a revista virou conteúdo primariamente
// exibido num iframe/celular, não mais um PDF pra impressão em alta
// resolução.
const RENDER_SCALE = 1.8;

// Caixa reservada em branco na contracapa oficial (página 55) — conferida
// visualmente (ver PROJECT.md), fração da página, origem no canto superior
// esquerdo (convenção de imagem/canvas).
const BACK_COVER_BOX = { xFrac: 0.084, yFrac: 0.735, widthFrac: 0.83, heightFrac: 0.183 };

async function readPublicFile(relativePath: string): Promise<Buffer> {
  return fs.readFile(path.join(process.cwd(), "public", relativePath));
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function wrapTextCanvas(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(attempt).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderOfficialPageCanvas(
  sourceBuffer: Buffer,
  pageNumber: number
): Promise<{ canvas: Canvas; ctx: SKRSContext2D; width: number; height: number }> {
  // Uma cópia nova do buffer a cada chamada: o pdf.js manda pro worker via
  // postMessage/structured clone, o que "esvazia" (detach) o Uint8Array
  // original — reusar a mesma instância numa segunda chamada quebra com
  // "DataCloneError: Cannot transfer object of unsupported type" (mesmo
  // problema já visto na ingestão do Guia Oficial, ver
  // src/modules/guide/ingest.ts).
  const rendered = await renderPageAsImage(new Uint8Array(sourceBuffer), pageNumber, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: RENDER_SCALE,
  });
  const img = await loadImage(Buffer.from(rendered));
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, width: img.width, height: img.height };
}

// JPEG, não PNG: cada página aqui é uma foto de página inteira (sem
// transparência), e o PDF final soma mais de 50 páginas nesse formato — PNG
// sem perdas testado ao vivo gerou um PDF de 167MB/106 páginas, inviável pra
// baixar no celular do consultor. JPEG qualidade 88 é visualmente
// indistinguível em página de revista e reduz o arquivo em ~85%.
const PAGE_IMAGE_QUALITY = 88;

async function embedCanvasAsPage(
  doc: PDFDocument,
  canvas: Canvas,
  pdfWidth: number,
  pdfHeight: number
): Promise<PDFPage> {
  const buffer = canvas.toBuffer("image/jpeg", PAGE_IMAGE_QUALITY);
  const image = await doc.embedJpg(buffer);
  const page = doc.addPage([pdfWidth, pdfHeight]);
  page.drawImage(image, { x: 0, y: 0, width: pdfWidth, height: pdfHeight });
  return page;
}

// Sobrepõe uma caixa branca exatamente sobre a região do preço antigo (do
// mapeamento, ver official-edition-mapping.ts) e escreve o preço atual do
// banco — a única alteração feita em cima da arte original (pedido
// explícito do cliente: "substituir automaticamente os preços").
function drawPriceOverlayOnCanvas(
  ctx: SKRSContext2D,
  canvasWidth: number,
  canvasHeight: number,
  priceBox: { xFrac: number; yFrac: number; widthFrac: number; heightFrac: number },
  item: ProductSnapshotItem
) {
  const priceCents = item.perfume ? Object.values(item.perfume.volumePrices)[0] : item.priceCents;
  if (priceCents === undefined || priceCents === null) return;

  // Padding generoso: as coordenadas vêm de OCR (não são pixel-perfeitas),
  // uma margem cobre a variação sem sobrar espaço demais.
  const padding = 0.006;
  const x = (priceBox.xFrac - padding) * canvasWidth;
  const y = (priceBox.yFrac - padding) * canvasHeight;
  const w = (priceBox.widthFrac + padding * 2) * canvasWidth;
  const h = (priceBox.heightFrac + padding * 2) * canvasHeight;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);

  const priceText = formatCents(priceCents);
  const fontSize = Math.round(h * 0.6);
  ctx.fillStyle = "#1A1A1A";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(priceText, x + w / 2, y + h / 2 + fontSize * 0.05);
}

async function drawCircularPhoto(
  ctx: SKRSContext2D,
  photoBuffer: Buffer,
  centerX: number,
  centerY: number,
  radius: number
) {
  try {
    const img = await loadImage(photoBuffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();
  } catch {
    // Foto num formato não suportado — segue sem foto, nunca quebra a geração.
  }
}

async function drawConsultantBlockOnCanvas(
  ctx: SKRSContext2D,
  {
    consultant,
    centerX,
    startY,
    maxWidth,
    qrBuffer,
    photoRadius = 55,
    align = "center",
    textColor = "#FFFFFF",
  }: {
    consultant: ConsultantInfo;
    centerX: number;
    startY: number;
    maxWidth: number;
    qrBuffer: Buffer | null;
    photoRadius?: number;
    align?: "center" | "left";
    textColor?: string;
  }
): Promise<number> {
  let cursorY = startY;

  if (consultant.photoUrl && consultant.showPhoto) {
    const photoBuffer = await fetchImageBuffer(consultant.photoUrl);
    if (photoBuffer) {
      await drawCircularPhoto(ctx, photoBuffer, centerX, cursorY + photoRadius, photoRadius);
      cursorY += photoRadius * 2 + 20;
    }
  }

  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.fillStyle = textColor;
  const textX = align === "center" ? centerX : centerX - maxWidth / 2;

  ctx.font = "bold 30px sans-serif";
  ctx.fillText(consultant.name, textX, cursorY + 24);
  cursorY += 42;

  ctx.font = "20px sans-serif";
  const lines = [
    consultant.jobTitle,
    consultant.showCity ? consultant.city : null,
    consultant.whatsapp ? `WhatsApp: ${consultant.whatsapp}` : null,
    consultant.showInstagram ? consultant.instagram : null,
  ].filter((line): line is string => !!line);

  for (const line of lines) {
    ctx.fillText(line, textX, cursorY + 16);
    cursorY += 28;
  }

  if (qrBuffer && consultant.showQrCode) {
    const qrImg = await loadImage(qrBuffer);
    const qrSize = photoRadius * 2.2;
    ctx.drawImage(qrImg, centerX - qrSize / 2, cursorY + 10, qrSize, qrSize);
    cursorY += qrSize + 20;
  }

  return cursorY;
}

async function buildOpeningPageCanvas(
  consultant: ConsultantInfo,
  qrBuffer: Buffer | null,
  width: number,
  height: number
): Promise<Canvas> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = getCoverPdfColor(consultant.coverColor);
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 52px serif";
  ctx.fillText("Revista Digital", width / 2, height * 0.32);
  ctx.font = "22px sans-serif";
  ctx.fillText("Atlântica Natural — personalizada para você", width / 2, height * 0.32 + 40);

  await drawConsultantBlockOnCanvas(ctx, {
    consultant,
    centerX: width / 2,
    startY: height * 0.42,
    maxWidth: width * 0.7,
    qrBuffer,
    photoRadius: 90,
  });

  return canvas;
}

async function drawBackCoverOverlayOnCanvas(
  ctx: SKRSContext2D,
  canvasWidth: number,
  canvasHeight: number,
  consultant: ConsultantInfo,
  qrBuffer: Buffer | null
) {
  const boxX = BACK_COVER_BOX.xFrac * canvasWidth;
  const boxY = BACK_COVER_BOX.yFrac * canvasHeight;
  const boxWidth = BACK_COVER_BOX.widthFrac * canvasWidth;
  const boxHeight = BACK_COVER_BOX.heightFrac * canvasHeight;

  const padding = boxHeight * 0.12;
  const photoRadius = Math.min(boxHeight / 2 - padding, boxWidth * 0.08);
  let textX = boxX + padding;

  if (consultant.photoUrl && consultant.showPhoto) {
    const photoBuffer = await fetchImageBuffer(consultant.photoUrl);
    if (photoBuffer) {
      await drawCircularPhoto(ctx, photoBuffer, boxX + padding + photoRadius, boxY + boxHeight / 2, photoRadius);
      textX = boxX + padding + photoRadius * 2 + padding;
    }
  }

  const qrSize = qrBuffer && consultant.showQrCode ? boxHeight - padding * 2 : 0;
  const textMaxWidth = boxX + boxWidth - padding - qrSize - (qrSize > 0 ? padding : 0) - textX;

  ctx.textAlign = "left";
  ctx.fillStyle = "#1A1A1A";
  let cursorY = boxY + padding + 22;

  ctx.font = "bold 26px sans-serif";
  ctx.fillText(consultant.name, textX, cursorY);
  cursorY += 30;

  ctx.font = "18px sans-serif";
  const lines = [
    consultant.jobTitle,
    consultant.showCity ? consultant.city : null,
    consultant.whatsapp ? `WhatsApp: ${consultant.whatsapp}` : null,
    consultant.showInstagram ? consultant.instagram : null,
  ].filter((line): line is string => !!line);

  for (const line of lines) {
    if (cursorY > boxY + boxHeight - padding) break;
    ctx.fillText(line, textX, cursorY);
    cursorY += 24;
  }

  if (consultant.magazineMessage && cursorY < boxY + boxHeight - padding) {
    ctx.font = "italic 16px sans-serif";
    const messageLines = wrapTextCanvas(ctx, consultant.magazineMessage, textMaxWidth);
    for (const line of messageLines) {
      if (cursorY > boxY + boxHeight - padding) break;
      ctx.fillText(line, textX, cursorY);
      cursorY += 20;
    }
  }

  if (qrBuffer && consultant.showQrCode) {
    const qrImg = await loadImage(qrBuffer);
    ctx.drawImage(qrImg, boxX + boxWidth - padding - qrSize, boxY + (boxHeight - qrSize) / 2, qrSize, qrSize);
  }
}

// Página nova, inserida logo após a página de colagem original, com "Para
// que serve"/"Principais benefícios"/"Como usar" (e pros perfumes:
// Inspirado em/família olfativa/notas/fixação/ocasião) — nunca sobrepõe a
// arte, só complementa. Cada campo só aparece quando o próprio dado existe
// (nunca inventado, ver guide-matching.ts/perfume-matching.ts). São páginas
// 100% novas (sem original por baixo), então usam a API vetorial normal do
// pdf-lib — sem a ambiguidade de camadas do resto do documento.
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(attempt, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawDetailPages(
  doc: PDFDocument,
  items: ProductSnapshotItem[],
  { pageWidth, pageHeight, font, fontBold }: { pageWidth: number; pageHeight: number; font: PDFFont; fontBold: PDFFont }
) {
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let page = doc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - margin;
    }
  };

  for (const item of items) {
    ensureSpace(60);
    page.drawText(item.name, { x: margin, y: cursorY, size: 14, font: fontBold });
    cursorY -= 18;

    const fields: { label: string; value: string | null }[] = item.perfume
      ? [
          { label: "Inspirado em", value: item.perfume.inspiredBy },
          { label: "Família olfativa", value: item.perfume.olfactoryCategory },
          { label: "Notas de saída", value: item.perfume.topNotes },
          { label: "Notas de corpo", value: item.perfume.heartNotes },
          { label: "Notas de fundo", value: item.perfume.baseNotes },
          { label: "Ocasião indicada", value: item.perfume.occasion },
        ]
      : [
          { label: "Para que serve", value: item.description },
          { label: "Principais benefícios", value: item.benefits },
          { label: "Como usar", value: item.howToUse },
          { label: "Ingredientes", value: item.ingredients },
        ];

    for (const field of fields) {
      if (!field.value) continue;
      ensureSpace(28);
      page.drawText(`${field.label}:`, { x: margin, y: cursorY, size: 10, font: fontBold });
      cursorY -= 13;
      const lines = wrapText(field.value, font, 9, contentWidth);
      for (const line of lines) {
        ensureSpace(12);
        page.drawText(line, { x: margin, y: cursorY, size: 9, font });
        cursorY -= 12;
      }
      cursorY -= 4;
    }

    cursorY -= 16;
  }
}

async function addFullPageImage(doc: PDFDocument, relativePath: string, pageWidth: number, pageHeight: number) {
  const bytes = await readPublicFile(relativePath);
  let image;
  try {
    image = await doc.embedJpg(bytes);
  } catch {
    image = await doc.embedPng(bytes);
  }
  const page = doc.addPage([pageWidth, pageHeight]);
  const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  page.drawImage(image, {
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
}

// Monta a revista personalizada reaproveitando byte a byte (como imagem —
// ver comentário no topo do arquivo) as páginas da edição oficial impressa
// (ver PROJECT.md). A arte de cada página de produto nunca é redesenhada,
// só recebe a sobreposição do preço atual (na própria região do preço
// antigo) e uma página nova logo depois com o enriquecimento do Guia/
// perfil de perfume. Capa e índice oficiais ficam intactos (cópia direta,
// sem overlay nenhum); a personalização do consultor vira uma página de
// abertura nova (antes da capa) e um overlay na caixa já reservada na
// contracapa.
export async function assembleOfficialMagazinePdf({ consultant }: { consultant: ConsultantInfo }): Promise<Buffer> {
  const edition = getActiveEdition();
  const sourceBuffer = await readPublicFile(edition.pdfPath);
  const sourceDoc = await PDFDocument.load(sourceBuffer);
  const outputDoc = await PDFDocument.create();

  const font = await outputDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await outputDoc.embedFont(StandardFonts.HelveticaBold);

  const { width: pageWidth, height: pageHeight } = sourceDoc.getPage(edition.coverPage - 1).getSize();

  const whatsappLink = buildWhatsappLink(consultant.whatsapp, consultant.magazineMessage || DEFAULT_MAGAZINE_MESSAGE);
  const qrDataUrl = whatsappLink && consultant.showQrCode ? await QRCode.toDataURL(whatsappLink, { width: 400, margin: 1 }) : null;
  const qrBuffer = qrDataUrl ? Buffer.from(qrDataUrl.split(",")[1], "base64") : null;

  // 1. Página de abertura personalizada — página nova, vetorial (não tem
  // original por baixo), fica antes da capa oficial intacta.
  const openingCanvas = await buildOpeningPageCanvas(consultant, qrBuffer, pageWidth * RENDER_SCALE, pageHeight * RENDER_SCALE);
  await embedCanvasAsPage(outputDoc, openingCanvas, pageWidth, pageHeight);

  // 2. Capa e índice oficiais — cópia direta, sem nenhuma alteração.
  const [coverPage] = await outputDoc.copyPages(sourceDoc, [edition.coverPage - 1]);
  outputDoc.addPage(coverPage);
  const [indexPage] = await outputDoc.copyPages(sourceDoc, [edition.indexPage - 1]);
  outputDoc.addPage(indexPage);

  // 3. Busca o enriquecimento de todos os SKUs mapeados de uma vez.
  const allSkus = Object.values(edition.mapping).flatMap((entries) => entries.map((e) => e.sku));
  const enrichmentBySku = await buildEnrichmentBySku(allSkus);

  for (let pageNum = edition.contentPageRange.start; pageNum <= edition.contentPageRange.end; pageNum++) {
    const mapping = edition.mapping[pageNum] ?? [];
    const mappedItems = mapping
      .map((entry) => ({ entry, item: enrichmentBySku.get(entry.sku) }))
      .filter((x): x is { entry: (typeof mapping)[number]; item: ProductSnapshotItem } => !!x.item);

    if (mappedItems.length === 0) {
      // Sem nenhum produto mapeado nessa página — cópia direta, sem overlay,
      // preserva qualidade (evita reamostrar como imagem à toa).
      const [copiedPage] = await outputDoc.copyPages(sourceDoc, [pageNum - 1]);
      outputDoc.addPage(copiedPage);
    } else {
      const { canvas, ctx, width, height } = await renderOfficialPageCanvas(sourceBuffer, pageNum);
      for (const { entry, item } of mappedItems) {
        drawPriceOverlayOnCanvas(ctx, width, height, entry.priceBox, item);
      }
      await embedCanvasAsPage(outputDoc, canvas, pageWidth, pageHeight);
      drawDetailPages(outputDoc, mappedItems.map((x) => x.item), { pageWidth, pageHeight, font, fontBold });
    }

    if (pageNum === edition.fragrancePage) {
      await addFullPageImage(outputDoc, "magazine/tabela-olfativa-masculina.jpg", pageWidth, pageHeight);
      await addFullPageImage(outputDoc, "magazine/tabela-olfativa-feminina.jpg", pageWidth, pageHeight);
    }
  }

  // 4. Contracapa oficial — overlay só na caixa já reservada na arte.
  const { canvas: backCoverCanvas, ctx: backCoverCtx, width: backW, height: backH } = await renderOfficialPageCanvas(
    sourceBuffer,
    edition.backCoverPage
  );
  await drawBackCoverOverlayOnCanvas(backCoverCtx, backW, backH, consultant, qrBuffer);
  await embedCanvasAsPage(outputDoc, backCoverCanvas, pageWidth, pageHeight);

  const bytes = await outputDoc.save();
  return Buffer.from(bytes);
}
