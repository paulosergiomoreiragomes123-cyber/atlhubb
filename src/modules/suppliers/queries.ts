import "server-only";
import { prisma } from "@/src/lib/prisma";

export function listSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export function listSuppliersForSelect() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}
