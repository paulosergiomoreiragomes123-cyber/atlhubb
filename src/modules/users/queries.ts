import "server-only";
import { prisma } from "@/src/lib/prisma";

export function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      city: true,
      state: true,
      createdAt: true,
      approvedAt: true,
    },
  });
}

export async function countPendingUsers() {
  return prisma.user.count({ where: { status: "AGUARDANDO" } });
}

export async function getUserStatusSummary() {
  const [aguardando, aprovado, reprovado, suspenso] = await Promise.all([
    prisma.user.count({ where: { status: "AGUARDANDO" } }),
    prisma.user.count({ where: { status: "APROVADO" } }),
    prisma.user.count({ where: { status: "REPROVADO" } }),
    prisma.user.count({ where: { status: "SUSPENSO" } }),
  ]);

  return {
    aguardando,
    aprovado,
    reprovado,
    suspenso,
    total: aguardando + aprovado + reprovado + suspenso,
  };
}
