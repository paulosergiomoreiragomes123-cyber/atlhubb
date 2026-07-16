import "server-only";
import { prisma } from "@/src/lib/prisma";

export function getMyProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      phone: true,
      city: true,
      whatsapp: true,
      instagram: true,
      photoUrl: true,
    },
  });
}
