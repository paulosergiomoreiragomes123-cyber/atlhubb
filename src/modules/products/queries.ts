import "server-only";
import { prisma } from "@/src/lib/prisma";
import { getStockMap, LOW_STOCK_THRESHOLD } from "@/src/modules/stock/queries";

// `prices: { take: 1, orderBy: { effectiveFrom: "desc" } }` pega, por produto,
// só a linha de preço mais recente — é assim que "preço atual" é lido a partir
// do histórico insert-only, sem precisar de uma coluna de preço redundante.
// `images: { orderBy: { position: "asc" }, take: 1 }` traz só a capa (a de
// menor position) — a galeria completa só é buscada na ficha/edição do produto.
const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  supplier: { select: { id: true, name: true } },
  prices: { orderBy: { effectiveFrom: "desc" as const }, take: 1 },
  images: { orderBy: { position: "asc" as const }, take: 1 },
};

export type ProductFilters = {
  q?: string;
  categoryId?: string;
  brandId?: string;
  active?: boolean;
  lowStock?: boolean;
};

async function withStock<T extends { id: string }>(products: T[]) {
  const stockMap = await getStockMap(products.map((p) => p.id));
  return products.map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }));
}

export async function listProducts(filters: ProductFilters = {}) {
  const products = await prisma.product.findMany({
    where: {
      active: filters.active,
      categoryId: filters.categoryId || undefined,
      brandId: filters.brandId || undefined,
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { sku: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: listInclude,
  });

  const withStockData = await withStock(products);
  if (!filters.lowStock) return withStockData;

  return withStockData.filter((p) => p.stock < LOW_STOCK_THRESHOLD);
}

export async function listActiveProducts(filters: { categoryId?: string; brandId?: string; q?: string } = {}) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      categoryId: filters.categoryId || undefined,
      brandId: filters.brandId || undefined,
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { sku: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: listInclude,
  });

  return withStock(products);
}

export function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      supplier: true,
      images: { orderBy: { position: "asc" } },
      prices: { orderBy: { effectiveFrom: "desc" } },
    },
  });
}

export async function getActiveProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, active: true },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      images: { orderBy: { position: "asc" } },
      prices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
    },
  });
  return product;
}

// Usada só pela exportação de CSV: precisa da galeria inteira (não só a
// capa) pra o round-trip export -> editar -> reimportar não perder imagens.
export async function listProductsForExport() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { slug: true } },
      brand: { select: { slug: true } },
      supplier: { select: { name: true } },
      prices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      images: { orderBy: { position: "asc" } },
    },
  });

  return withStock(products);
}

export async function getCatalogSummary() {
  const [total, active] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
  ]);
  return { total, active };
}
