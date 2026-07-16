"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import { magazineIssueSchema, type MagazineIssueInput } from "@/src/modules/magazine/schemas";

export type ActionResult = { message: string } | void;

export async function createMagazineIssueAction(
  input: MagazineIssueInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = magazineIssueSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const issue = await prisma.magazineIssue.create({
    data: {
      title: parsed.data.title,
      pdfUrl: parsed.data.pdfUrl,
      coverImageUrl: parsed.data.coverImageUrl || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.create",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title },
  });

  revalidatePath("/admin/revista");
  redirect(`/admin/revista/${issue.id}`);
}

export async function updateMagazineIssueAction(
  id: string,
  input: MagazineIssueInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = magazineIssueSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const issue = await prisma.magazineIssue.update({
    where: { id },
    data: {
      title: parsed.data.title,
      pdfUrl: parsed.data.pdfUrl,
      coverImageUrl: parsed.data.coverImageUrl || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.update",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title },
  });

  revalidatePath("/admin/revista");
  revalidatePath(`/admin/revista/${id}`);
  revalidatePath("/consultor/revista");
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
