"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import { supplierSchema, type SupplierInput } from "@/src/modules/suppliers/schemas";

export type ActionResult = { message: string } | void;

export async function createSupplierAction(input: SupplierInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      contactName: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "supplier.create",
    entityType: "Supplier",
    entityId: supplier.id,
    metadata: { name: supplier.name },
  });

  revalidatePath("/admin/fornecedores");
}

export async function updateSupplierAction(
  id: string,
  input: SupplierInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: parsed.data.name,
      contactName: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "supplier.update",
    entityType: "Supplier",
    entityId: supplier.id,
    metadata: { name: supplier.name },
  });

  revalidatePath("/admin/fornecedores");
}

export async function deleteSupplierAction(id: string): Promise<void> {
  const admin = await requireAdmin();

  const supplier = await prisma.supplier.delete({ where: { id } });

  await recordAuditLog({
    actor: admin,
    action: "supplier.delete",
    entityType: "Supplier",
    entityId: supplier.id,
    metadata: { name: supplier.name },
  });

  revalidatePath("/admin/fornecedores");
}
