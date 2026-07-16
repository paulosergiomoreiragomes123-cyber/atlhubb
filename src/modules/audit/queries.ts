import "server-only";
import { prisma } from "@/src/lib/prisma";

export async function listAuditLogs(filters: { entityType?: string; q?: string }) {
  return prisma.auditLog.findMany({
    where: {
      entityType: filters.entityType || undefined,
      ...(filters.q
        ? {
            OR: [
              { actorName: { contains: filters.q, mode: "insensitive" } },
              { actorEmail: { contains: filters.q, mode: "insensitive" } },
              { action: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listAuditEntityTypes() {
  const rows = await prisma.auditLog.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });
  return rows.map((r) => r.entityType);
}

export async function listRecentAuditLogs(limit: number) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
