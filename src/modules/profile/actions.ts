"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { profileSchema, type ProfileInput } from "@/src/modules/profile/schemas";

export type ActionResult = { message: string } | void;

// Self-service — cada consultor só edita o próprio perfil (requireApprovedUser
// devolve o usuário da sessão, nunca um id vindo do client). Esses campos
// aparecem no rodapé/última página da revista digital personalizada (ver
// src/components/magazine/magazine-view.tsx e PROJECT.md).
export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const user = await requireApprovedUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      whatsapp: parsed.data.whatsapp || null,
      instagram: parsed.data.instagram || null,
      photoUrl: parsed.data.photoUrl || null,
    },
  });

  revalidatePath("/consultor/perfil");
  revalidatePath("/consultor/revista");
}
