"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import { brandSchema, type BrandInput } from "@/src/modules/brands/schemas";

export type ActionResult = { message: string } | void;

export async function createBrandAction(input: BrandInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira nome e slug." };
  }

  const existing = await prisma.brand.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { message: "Já existe uma marca com esse slug." };
  }

  const brand = await prisma.brand.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      logoUrl: parsed.data.logoUrl || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "brand.create",
    entityType: "Brand",
    entityId: brand.id,
    metadata: { name: brand.name },
  });

  revalidatePath("/admin/marcas");
}

export async function updateBrandAction(id: string, input: BrandInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira nome e slug." };
  }

  const existing = await prisma.brand.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (existing) {
    return { message: "Já existe uma marca com esse slug." };
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      logoUrl: parsed.data.logoUrl || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "brand.update",
    entityType: "Brand",
    entityId: brand.id,
    metadata: { name: brand.name },
  });

  revalidatePath("/admin/marcas");
}

export async function deleteBrandAction(id: string): Promise<void> {
  const admin = await requireAdmin();

  const brand = await prisma.brand.delete({ where: { id } });

  await recordAuditLog({
    actor: admin,
    action: "brand.delete",
    entityType: "Brand",
    entityId: brand.id,
    metadata: { name: brand.name },
  });

  revalidatePath("/admin/marcas");
}
