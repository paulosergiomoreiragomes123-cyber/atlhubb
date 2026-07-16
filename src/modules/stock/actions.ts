"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import { getStockForProduct } from "@/src/modules/stock/queries";
import {
  stockAdjustmentSchema,
  stockCorrectionSchema,
  type StockAdjustmentInput,
  type StockCorrectionInput,
} from "@/src/modules/products/schemas";

export type ActionResult = { message: string } | void;

export async function adjustStockAction(
  productId: string,
  input: StockAdjustmentInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira a quantidade." };
  }

  const quantity = Number.parseInt(parsed.data.quantity, 10);
  const delta = parsed.data.reason === "SAIDA" ? -quantity : quantity;

  if (parsed.data.reason === "SAIDA") {
    const currentStock = await getStockForProduct(productId);
    if (quantity > currentStock) {
      return { message: `Estoque insuficiente: há apenas ${currentStock} unidade(s).` };
    }
  }

  await prisma.stockMovement.create({
    data: {
      productId,
      quantityDelta: delta,
      reason: parsed.data.reason,
      note: parsed.data.note || null,
      createdById: admin.id,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: parsed.data.reason === "SAIDA" ? "stock.saida" : "stock.entrada",
    entityType: "Product",
    entityId: productId,
    metadata: { quantity, note: parsed.data.note || undefined },
  });

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/produtos");
}

// Corrige o estoque pra uma quantidade absoluta (ex.: depois de uma contagem
// física) — calcula o delta necessário e registra como AJUSTE, sem expor
// "delta com sinal" pro admin digitar.
export async function setStockAction(
  productId: string,
  input: StockCorrectionInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = stockCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira a quantidade." };
  }

  const target = Number.parseInt(parsed.data.targetQuantity, 10);
  const currentStock = await getStockForProduct(productId);
  const delta = target - currentStock;

  if (delta === 0) {
    return { message: "O estoque já está nessa quantidade." };
  }

  await prisma.stockMovement.create({
    data: {
      productId,
      quantityDelta: delta,
      reason: "AJUSTE",
      note: parsed.data.note || null,
      createdById: admin.id,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "stock.correction",
    entityType: "Product",
    entityId: productId,
    metadata: { from: currentStock, to: target, delta },
  });

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/produtos");
}
