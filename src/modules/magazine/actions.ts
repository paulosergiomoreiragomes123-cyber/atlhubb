"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import {
  generateMagazineSchema,
  renameMagazineSchema,
  type GenerateMagazineInput,
  type RenameMagazineInput,
} from "@/src/modules/magazine/schemas";
import { buildMagazineSnapshot } from "@/src/modules/magazine/generator";
import type { Prisma } from "@/src/generated/prisma/client";

export type ActionResult = { message: string } | void;

// Magazine V3: totalmente automático — busca TODOS os produtos ativos,
// monta as seções por categoria (ver generator.ts), cria a edição em
// RASCUNHO. Admin só digita o título e revisa o preview antes de publicar.
// Sem PDF aqui: o PDF é gerado na hora, por consultor, em
// app/api/revista/[id]/pdf/route.ts — nunca armazenado.
export async function generateMagazineIssueAction(input: GenerateMagazineInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = generateMagazineSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const snapshot = await buildMagazineSnapshot();
  const productCount = snapshot.sections.reduce((sum, section) => sum + section.products.length, 0);

  const issue = await prisma.magazineIssue.create({
    data: {
      title: parsed.data.title,
      productSnapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.generate",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: {
      title: issue.title,
      sectionCount: snapshot.sections.length,
      productCount,
    },
  });

  revalidatePath("/admin/revista");
  redirect(`/admin/revista/${issue.id}`);
}

export async function renameMagazineIssueAction(
  id: string,
  input: RenameMagazineInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = renameMagazineSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Informe um título válido." };
  }

  const issue = await prisma.magazineIssue.update({
    where: { id },
    data: { title: parsed.data.title },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.rename",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title },
  });

  revalidatePath("/admin/revista");
  revalidatePath(`/admin/revista/${id}`);
  revalidatePath("/consultor/revista");
  revalidatePath(`/consultor/revista/${id}`);
}

export async function publishMagazineIssueAction(id: string): Promise<void> {
  const admin = await requireAdmin();

  const issue = await prisma.magazineIssue.update({
    where: { id },
    data: { status: "PUBLICADA", publishedAt: new Date() },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.publish",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title },
  });

  revalidatePath("/admin/revista");
  revalidatePath(`/admin/revista/${id}`);
  revalidatePath("/consultor/revista");
}

export async function unpublishMagazineIssueAction(id: string): Promise<void> {
  const admin = await requireAdmin();

  const issue = await prisma.magazineIssue.update({
    where: { id },
    data: { status: "RASCUNHO" },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.unpublish",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title },
  });

  revalidatePath("/admin/revista");
  revalidatePath(`/admin/revista/${id}`);
  revalidatePath("/consultor/revista");
}

export async function deleteMagazineIssueAction(id: string): Promise<void> {
  const admin = await requireAdmin();

  const issue = await prisma.magazineIssue.delete({ where: { id } });

  await recordAuditLog({
    actor: admin,
    action: "magazine.delete",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title },
  });

  revalidatePath("/admin/revista");
  revalidatePath("/consultor/revista");
}
