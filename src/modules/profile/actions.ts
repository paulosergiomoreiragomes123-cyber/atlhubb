"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { profileSchema, type ProfileInput } from "@/src/modules/profile/schemas";

export type ActionResult = { message: string } | void;

// Self-service — cada consultor só edita o próprio perfil (requireApprovedUser
// devolve o usuário da sessão, nunca um id vindo do client). Esses campos
// aparecem na capa personalizada/última página do PDF da revista digital
// (ver src/modules/magazine/official-pdf-assembler.ts e PROJECT.md).
export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      jobTitle: parsed.data.jobTitle || null,
      whatsapp: parsed.data.whatsapp || null,
      instagram: parsed.data.instagram || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      photoUrl: parsed.data.photoUrl || null,
      magazineMessage: parsed.data.magazineMessage || null,
      coverColor: parsed.data.coverColor,
      showQrCode: parsed.data.showQrCode,
      showPhoto: parsed.data.showPhoto,
      showInstagram: parsed.data.showInstagram,
      showCity: parsed.data.showCity,
    },
  });

  revalidatePath("/consultor/perfil");
  revalidatePath("/consultor/revista");
  revalidatePath("/consultor/revista/[id]", "page");
}
