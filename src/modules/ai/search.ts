import "server-only";
import { embed, cosineSimilarity } from "ai";
import { prisma } from "@/src/lib/prisma";
import { getStockMap } from "@/src/modules/stock/queries";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export type ProductSearchFilters = {
  query?: string;
  categoryId?: string;
  brandId?: string;
  maxPriceCents?: number;
  minPriceCents?: number;
  activeOnly?: boolean;
  limit?: number;
};

export type ProductSearchResult = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  attributes: unknown;
  priceCents: number | null;
  stock: number;
  // Fase 6A — presentes só pra produtos sincronizados da loja pública
  // (source: IMPORTADO); null pra produtos MANUAL. Usados pela IA pra
  // montar "Imagem"/"Link da loja"/"Comprar" na resposta (ver agent.ts) e
  // pelo ChatWindow pra renderizar o cartão de produto.
  storeUrl: string | null;
  imageUrl: string | null;
};

const productSearchInclude = {
  category: { select: { name: true } },
  brand: { select: { name: true } },
  prices: { orderBy: { effectiveFrom: "desc" as const }, take: 1 },
  images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
};

// Busca híbrida: filtros estruturados sempre via Prisma; a parte semântica
// (embedding da pergunta do consultor + similaridade de cosseno em memória —
// ver PROJECT.md seção 11 sobre a decisão de não usar pgvector) só entra
// quando `query` é passado. Se a chamada de embedding falhar por qualquer
// motivo (AI Gateway fora do ar, sem chave configurada), cai pra busca por
// texto simples (`contains`) em vez de quebrar a ferramenta inteira — a IA
// continua funcional, só com busca menos "inteligente" nesse caso.
export async function searchProducts(filters: ProductSearchFilters): Promise<ProductSearchResult[]> {
  const limit = filters.limit ?? 8;

  const baseWhere = {
    active: filters.activeOnly === false ? undefined : true,
    categoryId: filters.categoryId || undefined,
    brandId: filters.brandId || undefined,
  };

  let scoredCandidates: (ProductSearchResult & { embedding: number[] })[] | null = null;

  if (filters.query) {
    try {
      const { embedding: queryEmbedding } = await embed({
        model: EMBEDDING_MODEL,
        value: filters.query,
      });

      const candidates = await prisma.product.findMany({
        where: baseWhere,
        include: productSearchInclude,
      });

      scoredCandidates = candidates
        .filter((p) => p.embedding.length > 0)
        .map((p) => ({
          ...mapProduct(p),
          embedding: p.embedding,
          _score: cosineSimilarity(queryEmbedding, p.embedding),
        }))
        .sort((a, b) => b._score - a._score);
    } catch (error) {
      console.error("[ai] Busca semântica falhou, caindo para busca por texto:", error);
    }
  }

  let results: ProductSearchResult[];

  if (scoredCandidates && scoredCandidates.length > 0) {
    results = scoredCandidates;
  } else {
    const candidates = await prisma.product.findMany({
      where: {
        ...baseWhere,
        ...(filters.query
          ? {
              OR: [
                { name: { contains: filters.query, mode: "insensitive" as const } },
                { description: { contains: filters.query, mode: "insensitive" as const } },
                { sku: { contains: filters.query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: productSearchInclude,
      orderBy: { name: "asc" },
    });
    results = candidates.map(mapProduct);
  }

  const filteredByPrice = results.filter((p) => {
    if (filters.minPriceCents !== undefined && (p.priceCents === null || p.priceCents < filters.minPriceCents)) {
      return false;
    }
    if (filters.maxPriceCents !== undefined && (p.priceCents === null || p.priceCents > filters.maxPriceCents)) {
      return false;
    }
    return true;
  });

  const limited = filteredByPrice.slice(0, limit);
  const stockMap = await getStockMap(limited.map((p) => p.id));

  return limited.map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }));
}

function mapProduct(product: {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  attributes: unknown;
  category: { name: string } | null;
  brand: { name: string } | null;
  prices: { priceCents: number }[];
  images: { url: string }[];
  storeUrl: string | null;
}): ProductSearchResult {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category?.name ?? null,
    brand: product.brand?.name ?? null,
    attributes: product.attributes,
    priceCents: product.prices[0]?.priceCents ?? null,
    stock: 0, // preenchido depois via getStockMap — placeholder aqui só pro shape bater
    storeUrl: product.storeUrl,
    imageUrl: product.images[0]?.url ?? null,
  };
}
