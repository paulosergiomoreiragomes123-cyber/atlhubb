import "server-only";
import { prisma } from "@/src/lib/prisma";

export function getLatestSyncRun() {
  return prisma.storeSyncRun.findFirst({ orderBy: { startedAt: "desc" } });
}

export async function getStoreSyncStats() {
  const [syncedProducts, categorized, totalCategories] = await Promise.all([
    prisma.product.count({ where: { source: "IMPORTADO" } }),
    prisma.product.count({ where: { source: "IMPORTADO", categoryId: { not: null } } }),
    prisma.productCategory.count(),
  ]);

  return { syncedProducts, categorized, totalCategories };
}
