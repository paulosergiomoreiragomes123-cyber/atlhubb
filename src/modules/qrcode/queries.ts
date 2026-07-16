import "server-only";
import { prisma } from "@/src/lib/prisma";

export async function incrementScanCount(id: string) {
  await prisma.qrCode.update({
    where: { id },
    data: { scanCount: { increment: 1 } },
  });
}

// `select` explícito (não `include`) de propósito: essa página é pública e
// roda a cada scan de QR Code, então evita puxar do banco campos pesados e
// não usados pela UI — sobretudo `Product.embedding` (Float[] de 1536 posições).
export function getQrCodeBySlug(slug: string) {
  return prisma.qrCode.findUnique({
    where: { slug },
    select: {
      id: true,
      targetType: true,
      product: {
        select: {
          name: true,
          description: true,
          sku: true,
          active: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
          images: { orderBy: { position: "asc" }, select: { url: true, alt: true } },
          prices: { orderBy: { effectiveFrom: "desc" }, take: 1, select: { priceCents: true } },
        },
      },
      magazineIssue: {
        select: {
          title: true,
          pdfUrl: true,
          status: true,
          filterType: true,
          productSnapshot: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  });
}
