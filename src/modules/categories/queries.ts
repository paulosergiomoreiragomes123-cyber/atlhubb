import "server-only";
import { prisma } from "@/src/lib/prisma";

export function listCategories() {
  return prisma.productCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });
}

export function listCategoriesForSelect() {
  return prisma.productCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function getCategory(id: string) {
  return prisma.productCategory.findUnique({ where: { id } });
}
