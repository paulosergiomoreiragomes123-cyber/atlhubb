import "server-only";
import { embed, cosineSimilarity } from "ai";
import { prisma } from "@/src/lib/prisma";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export type GuideSearchResult = {
  content: string;
  pageNumber: number | null;
  documentTitle: string;
};

const guideChunkInclude = {
  guideDocument: { select: { title: true } },
};

// Mesma estratégia híbrida de src/modules/ai/search.ts (searchProducts):
// embedding + similaridade de cosseno quando disponível, com fallback pra
// busca por texto (`contains`) se a chamada de embedding falhar ou se os
// chunks ainda não tiverem embedding (ex.: ingestão rodou sem
// AI_GATEWAY_API_KEY configurada — ver src/modules/guide/ingest.ts).
export async function searchGuideChunks(query: string, limit = 5): Promise<GuideSearchResult[]> {
  // Só busca em documentos PRONTOS, e só na versão mais recente por título —
  // versões antigas ficam preservadas no banco (histórico), mas não entram
  // na resposta da IA.
  const readyDocuments = await prisma.guideDocument.findMany({
    where: { status: "PRONTO" },
    orderBy: { version: "desc" },
    select: { id: true, title: true, version: true },
  });
  const latestByTitle = new Map<string, string>();
  for (const doc of readyDocuments) {
    if (!latestByTitle.has(doc.title)) latestByTitle.set(doc.title, doc.id);
  }
  const guideDocumentIds = [...latestByTitle.values()];
  if (guideDocumentIds.length === 0) return [];

  try {
    const { embedding: queryEmbedding } = await embed({ model: EMBEDDING_MODEL, value: query });

    const candidates = await prisma.guideChunk.findMany({
      where: { guideDocumentId: { in: guideDocumentIds } },
      include: guideChunkInclude,
    });

    const scored = candidates
      .filter((c) => c.embedding.length > 0)
      .map((c) => ({
        content: c.content,
        pageNumber: c.pageNumber,
        documentTitle: c.guideDocument.title,
        _score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .sort((a, b) => b._score - a._score);

    if (scored.length > 0) {
      return scored.slice(0, limit).map(({ content, pageNumber, documentTitle }) => ({
        content,
        pageNumber,
        documentTitle,
      }));
    }
  } catch (error) {
    console.error("[guide] Busca semântica falhou, caindo para busca por texto:", error);
  }

  const textMatches = await prisma.guideChunk.findMany({
    where: {
      guideDocumentId: { in: guideDocumentIds },
      content: { contains: query, mode: "insensitive" },
    },
    include: guideChunkInclude,
    take: limit,
  });

  return textMatches.map((c) => ({
    content: c.content,
    pageNumber: c.pageNumber,
    documentTitle: c.guideDocument.title,
  }));
}
