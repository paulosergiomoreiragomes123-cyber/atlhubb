"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { recordAuditLog } from "@/src/modules/audit/log";
import { parseCentsFromInput } from "@/src/lib/currency";
import { parseProductsCsv } from "@/src/modules/products/csv";
import { reembedProductIfNeeded } from "@/src/modules/ai/embeddings";
import {
  createProductSchema,
  productDetailsSchema,
  priceAdjustmentSchema,
  type CreateProductInput,
  type ProductDetailsInput,
  type PriceAdjustmentInput,
} from "@/src/modules/products/schemas";

export type ActionResult = { message: string } | void;

function imagesToCreate(imageUrls: string[]) {
  return imageUrls.map((url, position) => ({ url, position }));
}

function parseAttributes(input: string | undefined) {
  if (!input) return undefined;
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

export async function createProductAction(input: CreateProductInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) {
    return { message: "Já existe um produto com esse SKU." };
  }

  const priceCents = parseCentsFromInput(parsed.data.priceInput)!;
  const initialStock = parsed.data.initialStock ? Number.parseInt(parsed.data.initialStock, 10) : 0;

  const product = await prisma.product.create({
    data: {
      sku: parsed.data.sku,
      name: parsed.data.name,
      description: parsed.data.description || null,
      categoryId: parsed.data.categoryId || null,
      brandId: parsed.data.brandId || null,
      supplierId: parsed.data.supplierId || null,
      active: parsed.data.active,
      attributes: parseAttributes(parsed.data.attributesInput),
      images: { create: imagesToCreate(parsed.data.imageUrls) },
      prices: { create: { priceCents, source: "AJUSTE_MANUAL" } },
      stockMovements: initialStock > 0
        ? { create: { quantityDelta: initialStock, reason: "ENTRADA", createdById: admin.id, note: "Estoque inicial" } }
        : undefined,
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    metadata: { sku: product.sku, name: product.name, priceCents, initialStock },
  });

  // Roda depois da resposta ser enviada — não atrasa o "produto criado" por
  // causa de uma chamada de embedding, mas o Next mantém a função viva até
  // terminar (ao contrário de um fire-and-forget de verdade).
  after(() => reembedProductIfNeeded(product.id));

  revalidatePath("/admin/produtos");
  revalidatePath("/consultor/catalogo");
  redirect(`/admin/produtos/${product.id}`);
}

export async function updateProductAction(
  id: string,
  input: ProductDetailsInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = productDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos." };
  }

  const existing = await prisma.product.findFirst({
    where: { sku: parsed.data.sku, NOT: { id } },
  });
  if (existing) {
    return { message: "Já existe um produto com esse SKU." };
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      sku: parsed.data.sku,
      name: parsed.data.name,
      description: parsed.data.description || null,
      categoryId: parsed.data.categoryId || null,
      brandId: parsed.data.brandId || null,
      supplierId: parsed.data.supplierId || null,
      active: parsed.data.active,
      attributes: parseAttributes(parsed.data.attributesInput),
      // Galeria inteira é substituída — mais simples e previsível do que tentar
      // "diffar" URL por URL, e o volume por produto (no máximo 10) não justifica
      // a complexidade extra de um diff.
      images: {
        deleteMany: {},
        create: imagesToCreate(parsed.data.imageUrls),
      },
    },
  });

  await recordAuditLog({
    actor: admin,
    action: "product.update",
    entityType: "Product",
    entityId: product.id,
    metadata: { sku: product.sku, name: product.name },
  });

  after(() => reembedProductIfNeeded(product.id));

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}`);
  revalidatePath("/consultor/catalogo");
  revalidatePath(`/consultor/catalogo/${id}`);
}

export async function adjustPriceAction(
  productId: string,
  input: PriceAdjustmentInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = priceAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Informe um preço válido." };
  }

  const priceCents = parseCentsFromInput(parsed.data.priceInput)!;

  await prisma.productPrice.create({
    data: { productId, priceCents, source: "AJUSTE_MANUAL" },
  });

  await recordAuditLog({
    actor: admin,
    action: "product.price_adjust",
    entityType: "Product",
    entityId: productId,
    metadata: { priceCents },
  });

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/produtos");
  revalidatePath("/consultor/catalogo");
  revalidatePath(`/consultor/catalogo/${productId}`);
}

export type ImportSummary = {
  created: number;
  updated: number;
  priceChanged: number;
  stockChanged: number;
  errors: { line: number; message: string }[];
};

// Substitui a sincronização automática com uma loja externa (não existe —
// ver PROJECT.md seção 13): admin exporta o catálogo, edita em planilha,
// reimporta. Upsert por SKU; preço e estoque só viram linha nova no
// respectivo histórico se o valor da planilha for diferente do atual —
// reimportar o mesmo CSV sem alterar nada não gera ruído em nenhum dos dois.
// Processa linha a linha e segue mesmo se uma falhar, reportando o motivo,
// em vez de abortar o arquivo inteiro por causa de uma linha ruim.
export async function importProductsCsvAction(
  _prevState: ImportSummary | undefined,
  formData: FormData
): Promise<ImportSummary> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      created: 0,
      updated: 0,
      priceChanged: 0,
      stockChanged: 0,
      errors: [{ line: 0, message: "Selecione um arquivo CSV." }],
    };
  }

  const text = await file.text();
  const { rows, errors } = parseProductsCsv(text);

  const [categories, brands, suppliers] = await Promise.all([
    prisma.productCategory.findMany({ select: { id: true, slug: true } }),
    prisma.brand.findMany({ select: { id: true, slug: true } }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
  ]);
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const brandIdBySlug = new Map(brands.map((b) => [b.slug, b.id]));
  const supplierIdByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]));

  const existingProducts = await prisma.product.findMany({
    where: { sku: { in: rows.map((r) => r.sku) } },
    include: { prices: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
  });
  const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));

  const currentStocks = existingProducts.length
    ? await prisma.stockMovement.groupBy({
        by: ["productId"],
        where: { productId: { in: existingProducts.map((p) => p.id) } },
        _sum: { quantityDelta: true },
      })
    : [];
  const stockByProductId = new Map(currentStocks.map((s) => [s.productId, s._sum.quantityDelta ?? 0]));

  let created = 0;
  let updated = 0;
  let priceChanged = 0;
  let stockChanged = 0;

  for (const row of rows) {
    let categoryId: string | null = null;
    if (row.categorySlug) {
      const found = categoryIdBySlug.get(row.categorySlug);
      if (!found) {
        errors.push({ line: row.line, message: `Categoria "${row.categorySlug}" não encontrada.` });
        continue;
      }
      categoryId = found;
    }

    let brandId: string | null = null;
    if (row.brandSlug) {
      const found = brandIdBySlug.get(row.brandSlug);
      if (!found) {
        errors.push({ line: row.line, message: `Marca "${row.brandSlug}" não encontrada.` });
        continue;
      }
      brandId = found;
    }

    let supplierId: string | null = null;
    if (row.supplierName) {
      const found = supplierIdByName.get(row.supplierName.toLowerCase());
      if (!found) {
        errors.push({ line: row.line, message: `Fornecedor "${row.supplierName}" não encontrado.` });
        continue;
      }
      supplierId = found;
    }

    let priceCents: number | null = null;
    if (row.priceInput) {
      priceCents = parseCentsFromInput(row.priceInput);
      if (priceCents === null) {
        errors.push({ line: row.line, message: `Preço inválido: "${row.priceInput}".` });
        continue;
      }
    }

    let targetStock: number | null = null;
    if (row.stockInput) {
      if (!/^\d+$/.test(row.stockInput)) {
        errors.push({ line: row.line, message: `Estoque inválido: "${row.stockInput}".` });
        continue;
      }
      targetStock = Number.parseInt(row.stockInput, 10);
    }

    const imageUrls = row.imageUrls.filter(Boolean);
    const existing = existingBySku.get(row.sku);

    if (!existing) {
      if (priceCents === null) {
        errors.push({ line: row.line, message: "Produto novo precisa de uma coluna price." });
        continue;
      }

      const newProduct = await prisma.product.create({
        data: {
          sku: row.sku,
          name: row.name,
          description: row.description || null,
          categoryId,
          brandId,
          supplierId,
          active: row.active,
          images: { create: imagesToCreate(imageUrls) },
          prices: { create: { priceCents, source: "AJUSTE_MANUAL" } },
          stockMovements: targetStock
            ? { create: { quantityDelta: targetStock, reason: "ENTRADA", createdById: admin.id, note: "Import CSV" } }
            : undefined,
        },
      });
      created += 1;
      if (targetStock) stockChanged += 1;
      after(() => reembedProductIfNeeded(newProduct.id));
      continue;
    }

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: row.name,
        description: row.description || null,
        categoryId,
        brandId,
        supplierId,
        active: row.active,
        ...(imageUrls.length > 0
          ? { images: { deleteMany: {}, create: imagesToCreate(imageUrls) } }
          : {}),
      },
    });
    updated += 1;
    after(() => reembedProductIfNeeded(existing.id));

    const currentPriceCents = existing.prices[0]?.priceCents ?? null;
    if (priceCents !== null && priceCents !== currentPriceCents) {
      await prisma.productPrice.create({
        data: { productId: existing.id, priceCents, source: "AJUSTE_MANUAL" },
      });
      priceChanged += 1;
    }

    if (targetStock !== null) {
      const currentStock = stockByProductId.get(existing.id) ?? 0;
      const delta = targetStock - currentStock;
      if (delta !== 0) {
        await prisma.stockMovement.create({
          data: {
            productId: existing.id,
            quantityDelta: delta,
            reason: "AJUSTE",
            note: "Import CSV",
            createdById: admin.id,
          },
        });
        stockChanged += 1;
      }
    }
  }

  await recordAuditLog({
    actor: admin,
    action: "product.csv_import",
    entityType: "Product",
    metadata: { created, updated, priceChanged, stockChanged, errorCount: errors.length },
  });

  revalidatePath("/admin/produtos");
  revalidatePath("/consultor/catalogo");

  return { created, updated, priceChanged, stockChanged, errors };
}
