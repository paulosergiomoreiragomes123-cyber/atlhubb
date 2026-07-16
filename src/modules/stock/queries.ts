import "server-only";
import { prisma } from "@/src/lib/prisma";

// Sem coluna de "estoque atual": é sempre a soma de StockMovement.quantityDelta
// (mesma lógica do "preço atual" em products/queries.ts, só que com SUM em vez
// de "pega a última linha").
export async function getStockForProduct(productId: string): Promise<number> {
  const result = await prisma.stockMovement.aggregate({
    where: { productId },
    _sum: { quantityDelta: true },
  });
  return result._sum.quantityDelta ?? 0;
}

export async function getStockMap(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const grouped = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _sum: { quantityDelta: true },
  });

  return new Map(grouped.map((g) => [g.productId, g._sum.quantityDelta ?? 0]));
}

export function listStockMovements(productId: string) {
  return prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
}

export const LOW_STOCK_THRESHOLD = 5;

export async function listLowStockProducts(threshold: number = LOW_STOCK_THRESHOLD) {
  const activeProducts = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, sku: true },
  });

  const stockMap = await getStockMap(activeProducts.map((p) => p.id));

  return activeProducts
    .map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }))
    .filter((p) => p.stock < threshold)
    .sort((a, b) => a.stock - b.stock);
}
