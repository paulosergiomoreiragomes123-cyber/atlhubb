import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

// Checagem SEGURA: sempre bate no banco, nunca confia só no que está no JWT.
// É por isso que uma suspensão feita pelo admin tem efeito imediato — o dado
// de status usado aqui nunca é o que veio no token de login.
// `cache()` garante que múltiplas chamadas dentro do mesmo render (layout +
// página, por exemplo) resultem em uma única query.
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApprovedUser() {
  const user = await requireUser();
  if (user.status !== "APROVADO") redirect("/aguardando-aprovacao");
  return user;
}

export async function requireAdmin() {
  const user = await requireApprovedUser();
  if (user.role !== "ADMIN") redirect("/consultor/painel");
  return user;
}
