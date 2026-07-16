import fs from "node:fs/promises";
import { embed } from "ai";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import { createWorker } from "tesseract.js";

import { prisma } from "@/src/lib/prisma";
import { hashText } from "@/src/lib/embedding-utils";

// Sem "server-only" de propósito: este módulo é chamado por
// scripts/ingest-guide.ts, um script tsx standalone fora do bundler do Next
// — mesmo motivo pelo qual prisma/seed.ts evita módulos "server-only" (ver
// comentário lá). O módulo de leitura usado dentro do app é
// src/modules/guide/search.ts, esse sim marcado "server-only".

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// Alvo de ~800-1200 caracteres por chunk: grande o bastante pra dar contexto
// útil pro modelo, pequeno o bastante pra não estourar a janela quando várias
// tools retornam resultado na mesma resposta. Nunca corta no meio de um
// parágrafo — só funde parágrafos vizinhos até chegar perto do alvo.
const CHUNK_TARGET_CHARS = 1000;
const CHUNK_MAX_CHARS = 1500;

// Abaixo disso, uma página é tratada como "sem texto" (PDF escaneado/sem
// camada de texto — confirmado ao vivo: o Guia Oficial de 2026 tem as 204
// páginas assim) e cai pro fallback de OCR. Um valor pequeno porque até
// página com texto real às vezes extrai só um cabeçalho residual.
const OCR_FALLBACK_MIN_CHARS = 20;

// OCR via tesseract.js (motor em WASM, sem serviço externo/chave de API —
// funciona mesmo sem AI_GATEWAY_API_KEY) só nas páginas onde `extractText`
// não achou texto nenhum. `renderPageAsImage` (do próprio `unpdf`) rasteriza
// a página como imagem via `@napi-rs/canvas` (binário nativo com build
// pré-compilado, sem precisar de toolchain de compilação — mesmo padrão do
// `sharp`, não um binário artesanal). Recebe o BUFFER bruto (não o
// `PDFDocumentProxy` já aberto): passar o proxy reaproveitado quebra o
// factory de canvas interno do pdf.js usado pra imagens embutidas dentro da
// própria página (erro real visto: "@napi-rs/canvas is not available in this
// environment" só na página com a capa ilustrada) — `renderPageAsImage` com
// o buffer cru configura esse factory do zero a cada chamada, e o custo
// extra de reabrir o documento é pequeno (~250-300ms/página, confirmado).
// Um único worker de OCR é reaproveitado pra todas as páginas que precisarem
// (criar um por página seria muito mais lento). Idioma "por" (português).
async function ocrPage(buffer: Uint8Array, pageNumber: number): Promise<string> {
  const worker = await getOcrWorker();
  // Cópia nova a cada chamada: o pdf.js manda o buffer pro worker interno via
  // `postMessage`/structured clone, o que "esvazia" (detach) o ArrayBuffer
  // original — reusar a mesma instância de Uint8Array numa segunda chamada
  // (já usada antes por `getDocumentProxy`/`extractText`, ou por uma página
  // de OCR anterior) quebra com "Cannot transfer object of unsupported type".
  const image = await renderPageAsImage(new Uint8Array(buffer), pageNumber, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: 2,
  });
  const { data } = await worker.recognize(Buffer.from(image));
  return data.text;
}

let ocrWorkerPromise: ReturnType<typeof createWorker> | null = null;
function getOcrWorker() {
  ocrWorkerPromise ??= createWorker("por");
  return ocrWorkerPromise;
}

async function terminateOcrWorkerIfStarted(): Promise<void> {
  if (!ocrWorkerPromise) return;
  const worker = await ocrWorkerPromise;
  await worker.terminate();
  ocrWorkerPromise = null;
}

export async function extractPdfPages(buffer: Uint8Array): Promise<string[]> {
  // `getDocumentProxy` manda o buffer pro worker do pdf.js via transferable
  // postMessage, o que o esvazia (detach) — passa uma cópia aqui pra manter
  // `buffer` (o parâmetro original) intacto pro fallback de OCR mais abaixo.
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });

  try {
    const result: string[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i].trim().length >= OCR_FALLBACK_MIN_CHARS) {
        result.push(text[i]);
        continue;
      }
      console.log(`[guide] Página ${i + 1}/${text.length} sem texto extraível, tentando OCR...`);
      result.push(await ocrPage(buffer, i + 1));
    }
    return result;
  } finally {
    await terminateOcrWorkerIfStarted();
  }
}

export function chunkPageText(pageText: string): string[] {
  const paragraphs = pageText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    if (current.length >= CHUNK_TARGET_CHARS || current.length + paragraph.length + 1 > CHUNK_MAX_CHARS) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = `${current}\n${paragraph}`;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

// Best-effort de propósito, mesmo padrão de reembedProductIfNeeded
// (src/modules/ai/embeddings.ts): sem AI_GATEWAY_API_KEY ou com a Gateway
// fora do ar, o chunk é salvo mesmo assim com embedding vazio — conteúdo e
// pageNumber nunca ficam bloqueados por causa do embedding. Rodar
// `npm run ai:reembed` depois preenche os embeddings pendentes.
async function embedChunkBestEffort(content: string): Promise<number[]> {
  try {
    const { embedding } = await embed({ model: EMBEDDING_MODEL, value: content });
    return embedding;
  } catch (error) {
    console.error("[guide] Falha ao gerar embedding do chunk, salvando sem embedding:", error);
    return [];
  }
}

export async function ingestGuideDocument({
  title,
  filePath,
}: {
  title: string;
  filePath: string;
}): Promise<{ guideDocumentId: string; chunkCount: number }> {
  const fileBuffer = await fs.readFile(filePath);

  const lastVersion = await prisma.guideDocument.findFirst({
    where: { title },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (lastVersion?.version ?? 0) + 1;

  const guideDocument = await prisma.guideDocument.create({
    data: { title, fileUrl: filePath, version, status: "PROCESSANDO" },
  });

  try {
    const pages = await extractPdfPages(new Uint8Array(fileBuffer));

    let chunkCount = 0;
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageChunks = chunkPageText(pages[pageIndex]);

      for (const content of pageChunks) {
        const embedding = await embedChunkBestEffort(content);
        await prisma.guideChunk.create({
          data: {
            guideDocumentId: guideDocument.id,
            content,
            pageNumber: pageIndex + 1,
            embedding,
            embeddingHash: hashText(content),
          },
        });
        chunkCount++;
      }
    }

    await prisma.guideDocument.update({
      where: { id: guideDocument.id },
      data: { status: "PRONTO" },
    });

    return { guideDocumentId: guideDocument.id, chunkCount };
  } catch (error) {
    await prisma.guideDocument.update({
      where: { id: guideDocument.id },
      data: { status: "ERRO" },
    });
    throw error;
  }
}
