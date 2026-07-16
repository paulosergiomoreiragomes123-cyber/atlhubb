import "server-only";
import { prisma } from "@/src/lib/prisma";

export function listBrands() {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export function listBrandsForSelect() {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export function getBrand(id: string) {
  return prisma.brand.findUnique({ where: { id } });
}
