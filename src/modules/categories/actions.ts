"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import { categorySchema, type CategoryInput } from "@/src/modules/categories/schemas";

export type ActionResult = { message: string } | void;

export async function createCategoryAction(input: CategoryInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira nome e slug." };
  }

  const existing = await prisma.productCategory.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return { message: "Já existe uma categoria com esse slug." };
  }

  const category = await prisma.productCategory.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      parentId: parsed.data.parentId || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "category.create",
    entityType: "ProductCategory",
    entityId: category.id,
    metadata: { name: category.name, slug: category.slug },
  });

  revalidatePath("/admin/categorias");
}

export async function updateCategoryAction(
  id: string,
  input: CategoryInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira nome e slug." };
  }

  if (parsed.data.parentId === id) {
    return { message: "Uma categoria não pode ser categoria-pai dela mesma." };
  }

  const existing = await prisma.productCategory.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (existing) {
    return { message: "Já existe uma categoria com esse slug." };
  }

  const category = await prisma.productCategory.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      parentId: parsed.data.parentId || null,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "category.update",
    entityType: "ProductCategory",
    entityId: category.id,
    metadata: { name: category.name, slug: category.slug },
  });

  revalidatePath("/admin/categorias");
}

// Retorna Promise<void> (não ActionResult): é usado direto em `<form action>`
// sem tratamento de erro na UI — o botão já vem desabilitado quando a
// categoria tem produtos/subcategorias, então não há mensagem pra mostrar.
export async function deleteCategoryAction(id: string): Promise<void> {
  const admin = await requireAdmin();

  // onDelete: SetNull no schema já cuida de "soltar" produtos e subcategorias
  // órfãos — não precisa de checagem manual antes de apagar.
  const category = await prisma.productCategory.delete({ where: { id } });

  await recordAuditLog({
    actor: admin,
    action: "category.delete",
    entityType: "ProductCategory",
    entityId: category.id,
    metadata: { name: category.name, slug: category.slug },
  });

  revalidatePath("/admin/categorias");
}
