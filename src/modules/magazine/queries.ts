import "server-only";
import { prisma } from "@/src/lib/prisma";

export function listMagazineIssues() {
  return prisma.magazineIssue.findMany({ orderBy: { createdAt: "desc" } });
}

export function listPublishedMagazineIssues() {
  return prisma.magazineIssue.findMany({
    where: { status: "PUBLICADA" },
    orderBy: { publishedAt: "desc" },
  });
}

export function getMagazineIssue(id: string) {
  return prisma.magazineIssue.findUnique({ where: { id } });
}

export function getPublishedMagazineIssue(id: string) {
  return prisma.magazineIssue.findFirst({ where: { id, status: "PUBLICADA" } });
}
