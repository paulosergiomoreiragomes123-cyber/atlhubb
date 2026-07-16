import "server-only";
import { prisma } from "@/src/lib/prisma";
import type { ConsultantInfo } from "@/src/components/magazine/magazine-view";

export function getMyProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      phone: true,
      city: true,
      state: true,
      whatsapp: true,
      instagram: true,
      photoUrl: true,
      jobTitle: true,
      magazineMessage: true,
      coverColor: true,
      showQrCode: true,
      showPhoto: true,
      showInstagram: true,
      showCity: true,
    },
  });
}

// Fonte única dos valores-padrão de personalização (mesmos defaults do
// schema Prisma) — usada por todo lugar que monta a revista pra um
// consultor (leitor, PDF sob demanda, preview do admin, QR Code público),
// pra nenhum deles esquecer um campo novo e cair num `undefined`.
export function buildConsultantInfo(
  profile: Awaited<ReturnType<typeof getMyProfile>> | null,
  fallbackName: string
): ConsultantInfo {
  return {
    name: profile?.name ?? fallbackName,
    phone: profile?.phone ?? null,
    whatsapp: profile?.whatsapp ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    instagram: profile?.instagram ?? null,
    photoUrl: profile?.photoUrl ?? null,
    jobTitle: profile?.jobTitle ?? null,
    magazineMessage: profile?.magazineMessage ?? null,
    coverColor: profile?.coverColor ?? "VERDE",
    showQrCode: profile?.showQrCode ?? true,
    showPhoto: profile?.showPhoto ?? true,
    showInstagram: profile?.showInstagram ?? true,
    showCity: profile?.showCity ?? true,
  };
}
