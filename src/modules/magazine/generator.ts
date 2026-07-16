import "server-only";
import { prisma } from "@/src/lib/prisma";
import type { MagazineFilterType, MagazineSortBy } from "@/src/generated/prisma/client";
import { findGuideExcerptForProduct } from "@/src/modules/magazine/guide-excerpt";

// Snapshot congelado no momento da geração (ver PROJECT.md, Fase 7) — o que
// a revista mostra depois nunca muda mesmo que o produto seja editado ou
// desativado, e a leitura não precisa rejuntar Product toda vez que alguém
// abre a página.
export type ProductSnapshotItem = {
  productId: string;
  sku: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  imageUrl: string | null;
  storeUrl: string | null;
  categoryName: string | null;
  volume: string | null;
  beneficios: string | null;
  modoDeUso: string | null;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
// Ex.: "100ml", "15 ml", "500g", "1kg" — texto que já existe no nome do
// produto, não um dado novo inventado.
const VOLUME_PATTERN = /\b(\d+(?:[.,]\d+)?\s?(?:ml|g|kg|l))\b/i;

const productListInclude = {
  category: { select: { name: true } },
  prices: { orderBy: { effectiveFrom: "desc" as const }, take: 1 },
  images: { orderBy: { position: "asc" as const }, take: 1 },
};

type ProductWithRelations = Awaited<ReturnType<typeof getProductsForFilters>>[number];

// Uma condição Prisma por filtro — combinadas em OR quando mais de um é
// marcado no admin (união, não interseção). Definições confirmadas com o
// cliente (2026-07-16): nenhuma tem campo próprio no banco, são derivadas do
// que já existe (categoria/data).
function conditionForFilter(filter: MagazineFilterType) {
  switch (filter) {
    case "LANCAMENTOS":
      return { createdAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) } };
    case "PROMOCOES":
      return { category: { slug: "promocao" } };
    case "PERFUMES":
      return { category: { name: { contains: "perfume", mode: "insensitive" as const } } };
    case "SUPLEMENTOS":
      return { category: { slug: "nutraceuticos" } };
    case "COSMETICOS":
      return { category: { slug: "cosmetico-ozonizado" } };
    default:
      return {};
  }
}

function buildWhere(filterTypes: MagazineFilterType[]) {
  const baseWhere = { active: true };
  if (filterTypes.length === 0 || filterTypes.includes("TODOS")) return baseWhere;
  return { ...baseWhere, OR: filterTypes.map(conditionForFilter) };
}

export function getProductsForFilters(filterTypes: MagazineFilterType[]) {
  return prisma.product.findMany({ where: buildWhere(filterTypes), include: productListInclude });
}

// MAIS_VENDIDOS cai pro mesmo critério de NOME — não existe dado de venda em
// lugar nenhum do sistema (a Atlântica não processa pedido dentro do
// AtlHub), então fingir uma ordenação por popularidade seria inventar um
// número. A UI deixa isso explícito (ver GenerateMagazineForm).
function sortProducts(products: ProductWithRelations[], sortBy: MagazineSortBy): ProductWithRelations[] {
  const sorted = [...products];
  switch (sortBy) {
    case "PRECO":
      return sorted.sort((a, b) => (a.prices[0]?.priceCents ?? 0) - (b.prices[0]?.priceCents ?? 0));
    case "LANCAMENTOS":
      return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case "NOME":
    case "MAIS_VENDIDOS":
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
}

function extractVolume(name: string): string | null {
  const match = name.match(VOLUME_PATTERN);
  return match ? match[1].replace(/\s+/g, "") : null;
}

// Por produto, busca um trecho real do Guia Oficial (ver guide-excerpt.ts —
// determinístico, nunca inventa) — feito sequencialmente por simplicidade;
// o catálogo tem algumas centenas de produtos e o GuideChunk é uma tabela
// pequena, então o custo total é aceitável sem precisar de lote/paralelismo.
export async function buildProductSnapshot(
  products: ProductWithRelations[],
  sortBy: MagazineSortBy
): Promise<ProductSnapshotItem[]> {
  const sorted = sortProducts(products, sortBy);

  const items: ProductSnapshotItem[] = [];
  for (const p of sorted) {
    const guide = await findGuideExcerptForProduct(p.name);
    items.push({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      priceCents: p.prices[0]?.priceCents ?? null,
      imageUrl: p.images[0]?.url ?? null,
      storeUrl: p.storeUrl,
      categoryName: p.category?.name ?? null,
      volume: extractVolume(p.name),
      beneficios: guide.beneficios,
      modoDeUso: guide.modoDeUso,
    });
  }
  return items;
}

export async function buildMagazineSnapshot(
  filterTypes: MagazineFilterType[],
  sortBy: MagazineSortBy
): Promise<ProductSnapshotItem[]> {
  const products = await getProductsForFilters(filterTypes);
  return buildProductSnapshot(products, sortBy);
}
