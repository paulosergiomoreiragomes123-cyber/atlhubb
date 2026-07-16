"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";

export async function approveUserAction(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "APROVADO", approvedById: admin.id, approvedAt: new Date() },
  });

  await recordAuditLog({
    actor: admin,
    action: "user.approve",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/usuarios");
}

export async function rejectUserAction(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "REPROVADO", approvedById: null, approvedAt: null },
  });

  await recordAuditLog({
    actor: admin,
    action: "user.reject",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/usuarios");
}

export async function suspendUserAction(userId: string) {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    throw new Error("Você não pode suspender sua própria conta.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "SUSPENSO" },
  });

  await recordAuditLog({
    actor: admin,
    action: "user.suspend",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/usuarios");
}

export async function reactivateUserAction(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "APROVADO", approvedById: admin.id, approvedAt: new Date() },
  });

  await recordAuditLog({
    actor: admin,
    action: "user.reactivate",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/usuarios");
}
