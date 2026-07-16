// Sem "server-only" de propósito: importado por scripts/reembed-all.ts
// (script tsx standalone) e por src/modules/store-sync/actions.ts (Server
// Action do botão "Regerar embeddings" em /admin/loja) — mesmo motivo de
// src/modules/guide/ingest.ts.
import { embed } from "ai";

import { prisma } from "@/src/lib/prisma";
import { buildProductEmbeddingText, hashText } from "@/src/lib/embedding-utils";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export type ReembedSummary = {
  productsUpdated: number;
  productsSkipped: number;
  chunksUpdated: number;
};

// Backfill sob demanda — cobre dois casos que ficam pendentes quando a
// ingestão/cadastro roda sem AI_GATEWAY_API_KEY configurada:
//   - produtos com embeddingHash desatualizado (nunca reembedados de fato)
//   - chunks do Guia salvos sem embedding (ver src/modules/guide/ingest.ts)
// Idempotente: rodar de novo sem uma chave nova não muda nada (mesmos itens
// continuam sem embedding, só loga e segue — mesmo padrão best-effort do
// resto do módulo de IA, ver src/modules/ai/embeddings.ts).
async function reembedProducts(): Promise<{ updated: number; skipped: number }> {
  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const text = buildProductEmbeddingText(product);
    const newHash = hashText(text);
    if (newHash === product.embeddingHash && product.embedding.length > 0) {
      skipped++;
      continue;
    }

    try {
      const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });
      await prisma.product.update({
        where: { id: product.id },
        data: { embedding, embeddingHash: newHash },
      });
      updated++;
    } catch (error) {
      console.error(`[reembed] Falha ao reembedar produto ${product.id}:`, error);
    }
  }

  return { updated, skipped };
}

async function reembedGuideChunks(): Promise<{ updated: number }> {
  const chunks = await prisma.guideChunk.findMany({ where: { embedding: { equals: [] } } });

  let updated = 0;

  for (const chunk of chunks) {
    try {
      const { embedding } = await embed({ model: EMBEDDING_MODEL, value: chunk.content });
      await prisma.guideChunk.update({
        where: { id: chunk.id },
        data: { embedding, embeddingHash: hashText(chunk.content) },
      });
      updated++;
    } catch (error) {
      console.error(`[reembed] Falha ao reembedar chunk ${chunk.id}:`, error);
    }
  }

  return { updated };
}

export async function reembedAllPending(): Promise<ReembedSummary> {
  const products = await reembedProducts();
  const chunks = await reembedGuideChunks();

  return {
    productsUpdated: products.updated,
    productsSkipped: products.skipped,
    chunksUpdated: chunks.updated,
  };
}
