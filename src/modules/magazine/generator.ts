import "server-only";
import { prisma } from "@/src/lib/prisma";
import type { MagazineFilterType } from "@/src/generated/prisma/client";

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
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const productListInclude = {
  category: { select: { name: true } },
  prices: { orderBy: { effectiveFrom: "desc" as const }, take: 1 },
  images: { orderBy: { position: "asc" as const }, take: 1 },
};

// Definições de filtro confirmadas com o cliente (2026-07-16) — nenhuma tem
// campo próprio no banco hoje, então são derivadas do que já existe:
// Lançamentos = sincronizado nos últimos 30 dias; Promoções = categoria da
// loja "Promoção"; Perfumes = categoria com "perfume" no nome; Suplementos =
// categoria "Nutraceuticos" (a mais próxima que existe hoje).
function buildWhere(filter: MagazineFilterType) {
  const baseWhere = { active: true };

  switch (filter) {
    case "LANCAMENTOS":
      return { ...baseWhere, createdAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) } };
    case "PROMOCOES":
      return { ...baseWhere, category: { slug: "promocao" } };
    case "PERFUMES":
      return { ...baseWhere, category: { name: { contains: "perfume", mode: "insensitive" as const } } };
    case "SUPLEMENTOS":
      return { ...baseWhere, category: { slug: "nutraceuticos" } };
    default:
      return baseWhere;
  }
}

export function getProductsForFilter(filter: MagazineFilterType) {
  return prisma.product.findMany({
    where: buildWhere(filter),
    orderBy: { name: "asc" },
    include: productListInclude,
  });
}

// `description` é null pra quase todo o catálogo sincronizado (a loja
// raramente expõe isso) — o snapshot guarda o que existir, nunca inventa
// texto; MagazineView/pdf-template só renderizam a seção quando não é null.
export function buildProductSnapshot(
  products: Awaited<ReturnType<typeof getProductsForFilter>>
): ProductSnapshotItem[] {
  return products.map((p) => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    priceCents: p.prices[0]?.priceCents ?? null,
    imageUrl: p.images[0]?.url ?? null,
    storeUrl: p.storeUrl,
    categoryName: p.category?.name ?? null,
  }));
}

export async function buildMagazineSnapshot(filter: MagazineFilterType): Promise<ProductSnapshotItem[]> {
  const products = await getProductsForFilter(filter);
  return buildProductSnapshot(products);
}
