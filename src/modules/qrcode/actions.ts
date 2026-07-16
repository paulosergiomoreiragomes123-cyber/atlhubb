"use server";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { generateSlug, generateQrCodeDataUrl, buildShareUrl } from "@/src/lib/qrcode";

export type QrCodeTarget =
  | { targetType: "PRODUTO"; productId: string }
  | { targetType: "CATALOGO" }
  | { targetType: "REVISTA"; magazineIssueId: string };

// Um QrCode por alvo, reaproveitado por quem quer que compartilhe — não "um
// link por consultor". Ver schema.prisma (model QrCode) pra mais contexto.
export async function getOrCreateQrCodeAction(target: QrCodeTarget) {
  const user = await requireApprovedUser();

  const where =
    target.targetType === "PRODUTO"
      ? { targetType: "PRODUTO" as const, productId: target.productId }
      : target.targetType === "REVISTA"
        ? { targetType: "REVISTA" as const, magazineIssueId: target.magazineIssueId }
        : { targetType: "CATALOGO" as const };

  let qrCode = await prisma.qrCode.findFirst({ where });

  if (!qrCode) {
    for (let attempt = 0; attempt < 5 && !qrCode; attempt++) {
      try {
        qrCode = await prisma.qrCode.create({
          data: {
            slug: generateSlug(),
            createdById: user.id,
            targetType: target.targetType,
            productId: target.targetType === "PRODUTO" ? target.productId : null,
            magazineIssueId: target.targetType === "REVISTA" ? target.magazineIssueId : null,
          },
        });
      } catch {
        // colisão de slug (rara) — tenta de novo com um novo slug aleatório
      }
    }
  }

  if (!qrCode) {
    throw new Error("Não foi possível gerar o QR Code. Tente de novo.");
  }

  const dataUrl = await generateQrCodeDataUrl(qrCode.slug);

  return {
    slug: qrCode.slug,
    scanCount: qrCode.scanCount,
    shareUrl: buildShareUrl(qrCode.slug),
    dataUrl,
  };
}
