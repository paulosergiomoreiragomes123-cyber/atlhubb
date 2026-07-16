"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import {
  generateMagazineSchema,
  renameMagazineSchema,
  type GenerateMagazineInput,
  type RenameMagazineInput,
} from "@/src/modules/magazine/schemas";
import { buildMagazineSnapshot, type ProductSnapshotItem } from "@/src/modules/magazine/generator";
import { renderMagazinePdf } from "@/src/modules/magazine/pdf-template";
import type { Prisma } from "@/src/generated/prisma/client";

export type ActionResult = { message: string } | void;

// Substitui o antigo fluxo de upload manual (createMagazineIssueAction):
// monta o snapshot de produtos do filtro escolhido (ver src/modules/magazine/
// generator.ts) e já cria a edição com ele embutido, em RASCUNHO — o admin
// revisa o preview antes de publicar.
export async function generateMagazineIssueAction(input: GenerateMagazineInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = generateMagazineSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const snapshot = await buildMagazineSnapshot(parsed.data.filterType);

  const issue = await prisma.magazineIssue.create({
    data: {
      title: parsed.data.title,
      filterType: parsed.data.filterType,
      productSnapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "magazine.generate",
    entityType: "MagazineIssue",
    entityId: issue.id,
    metadata: { title: issue.title, filterType: issue.filterType, productCount: snapshot.length },
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

// Exportação sob demanda — a leitura normal é a página HTML (MagazineView),
// o PDF só existe depois que alguém clica nesse botão. Renderiza com
// @react-pdf/renderer (JS puro, sem binário nativo, mesmo padrão de
// tesseract.js/unpdf já usados no projeto) e sobe pro Blob já existente
// (mesmo Store usado pelo upload manual de antes).
export async function exportMagazinePdfAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const issue = await prisma.magazineIssue.findUnique({ where: { id } });
  if (!issue) {
    return { message: "Edição não encontrada." };
  }

  const snapshot = (issue.productSnapshot ?? []) as unknown as ProductSnapshotItem[];

  try {
    const pdfBuffer = await renderMagazinePdf({ title: issue.title, products: snapshot });

    const blob = await put(`revistas/${issue.id}.pdf`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });

    await prisma.magazineIssue.update({ where: { id }, data: { pdfUrl: blob.url } });

    await recordAuditLog({
      actor: admin,
      action: "magazine.export_pdf",
      entityType: "MagazineIssue",
      entityId: id,
      metadata: { title: issue.title },
    });

    revalidatePath(`/admin/revista/${id}`);
    revalidatePath(`/consultor/revista/${id}`);
  } catch (error) {
    console.error("[magazine] Falha ao exportar PDF:", error);
    return {
      message: "Falha ao gerar o PDF. Confira se BLOB_READ_WRITE_TOKEN está configurada.",
    };
  }
}
