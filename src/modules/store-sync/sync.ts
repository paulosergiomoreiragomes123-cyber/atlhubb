// Sem "server-only" de propósito: chamado por scripts/sync-store.ts (script
// tsx standalone) e por app/api/cron/sync-loja/route.ts, além da Server Action
// em src/modules/store-sync/actions.ts — mesmo motivo de
// src/modules/guide/ingest.ts.
import { prisma } from "@/src/lib/prisma";
import { reembedAllPending } from "@/src/modules/ai/reembed";
import { StoreSession } from "@/src/modules/store-sync/client";
import {
  parseCategoryListingPage,
  parseCategoryNav,
  parseLastPageNumber,
  parseProductDetailPage,
} from "@/src/modules/store-sync/parser";
import type { StoreCategory, StoreProductCard, StoreSyncResult } from "@/src/modules/store-sync/types";

const BASE_URL = "https://loja.atlanticanatural.com.br";
// Grande o bastante pra trazer a categoria inteira numa página só (confirmado
// ao vivo: a loja aceita `quantidade` bem acima do padrão de 9) — evita
// implementar um loop de paginação pro caso comum. `parseLastPageNumber` cobre
// o caso raro de uma categoria ultrapassar isso.
const LISTING_PAGE_SIZE = 300;

// Categorias confirmadas por inspeção ao vivo da navegação da loja (2026-07-15)
// — usado como fallback se a home não puder ser lida por qualquer motivo
// (ex.: mudança de layout). `parseCategoryNav` é sempre tentado primeiro.
const FALLBACK_CATEGORIES: StoreCategory[] = [
  { slug: "academia", storeId: "4", name: "Academia" },
  { slug: "chas", storeId: "5", name: "Chás" },
  { slug: "convencao", storeId: "10", name: "Convenção" },
  { slug: "cosmetico-ozonizado", storeId: "11", name: "Cosmético Ozonizado" },
  { slug: "cruzeiro", storeId: "27", name: "Cruzeiro" },
  { slug: "linha-casa-ozonio", storeId: "37", name: "Linha Casa Ozônio" },
  { slug: "linha-impera", storeId: "115", name: "Linha Impéra" },
  { slug: "linha-nema", storeId: "36", name: "Linha Nema" },
  { slug: "maquiagem-ozonio", storeId: "22", name: "Maquiagem Ozônio" },
  { slug: "material-apoio", storeId: "13", name: "Material de Apoio" },
  { slug: "moda-mkp", storeId: "29", name: "Moda MKP" },
  { slug: "nutraceuticos", storeId: "14", name: "Nutracêuticos" },
  { slug: "oleo-ozonizado", storeId: "15", name: "Óleo Ozonizado" },
  { slug: "oleos-essenciais", storeId: "16", name: "Óleos Essenciais" },
  { slug: "perfume-antigo", storeId: "17", name: "Perfume" },
  { slug: "perfume-bortoletto", storeId: "35", name: "Perfume Bortoletto" },
  { slug: "promocao", storeId: "18", name: "Promoção" },
  { slug: "pulseiras", storeId: "19", name: "Pulseiras" },
  { slug: "servicos", storeId: "20", name: "Serviços" },
  { slug: "vitaminas", storeId: "21", name: "Vitaminas" },
  { slug: "wave-global", storeId: "34", name: "Wave Global" },
];

function listingUrl(category: StoreCategory, page: number): string {
  return `/produtos/categoria/${category.slug}/${category.storeId}?pagina=${page}&quantidade=${LISTING_PAGE_SIZE}&ordenacao=Latest`;
}

async function discoverCategories(session: StoreSession, errors: StoreSyncResult["errors"]): Promise<StoreCategory[]> {
  try {
    const homeHtml = await session.fetchHtml("/");
    const found = parseCategoryNav(homeHtml);
    if (found.length > 0) return found;
  } catch (error) {
    errors.push({ context: "discoverCategories", message: String(error) });
  }
  console.warn("[store-sync] Não consegui descobrir categorias na home, usando lista conhecida.");
  return FALLBACK_CATEGORIES;
}

async function collectCategoryCards(
  session: StoreSession,
  category: StoreCategory,
  errors: StoreSyncResult["errors"]
): Promise<StoreProductCard[]> {
  const cards: StoreProductCard[] = [];

  try {
    const firstPageHtml = await session.fetchHtml(listingUrl(category, 1));
    cards.push(...parseCategoryListingPage(firstPageHtml, category.slug, BASE_URL));

    // Só entra aqui se a categoria tiver mais produtos do que
    // LISTING_PAGE_SIZE cabe numa página só — caso raro, mas cobre o cliente
    // crescendo o catálogo no futuro sem o crawler silenciosamente perder produtos.
    if (cards.length >= LISTING_PAGE_SIZE) {
      const lastPage = parseLastPageNumber(firstPageHtml);
      for (let page = 2; page <= lastPage; page++) {
        const html = await session.fetchHtml(listingUrl(category, page));
        cards.push(...parseCategoryListingPage(html, category.slug, BASE_URL));
      }
    }
  } catch (error) {
    errors.push({ context: `categoria:${category.slug}`, message: String(error) });
  }

  return cards;
}

async function upsertProductCategory(slug: string, name: string): Promise<string> {
  const existing = await prisma.productCategory.findUnique({ where: { slug } });
  if (existing) return existing.id;

  const created = await prisma.productCategory.create({ data: { slug, name } });
  return created.id;
}

export async function runStoreSync(triggeredBy: string): Promise<StoreSyncResult> {
  const errors: StoreSyncResult["errors"] = [];
  const run = await prisma.storeSyncRun.create({ data: { triggeredBy, status: "EM_ANDAMENTO" } });

  const session = new StoreSession();

  try {
    await session.login();
  } catch (error) {
    const message = String(error);
    errors.push({ context: "login", message });
    await prisma.storeSyncRun.update({
      where: { id: run.id },
      data: { status: "ERRO", finishedAt: new Date(), errors },
    });
    return { status: "ERRO", categoriesFound: 0, productsFound: 0, created: 0, updated: 0, unchanged: 0, errors };
  }

  const categories = await discoverCategories(session, errors);

  const cardsById = new Map<string, StoreProductCard>();
  for (const category of categories) {
    const cards = await collectCategoryCards(session, category, errors);
    for (const card of cards) cardsById.set(card.storeProductId, card);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const card of cardsById.values()) {
    try {
      let html: string;
      try {
        html = await session.fetchHtml(card.detailPath);
      } catch (error) {
        errors.push({ context: `detalhe:${card.storeProductId}`, message: String(error) });
        continue;
      }

      const detail = parseProductDetailPage(html, BASE_URL);
      if (!detail) {
        errors.push({ context: `detalhe:${card.storeProductId}`, message: "Estrutura de página inesperada." });
        continue;
      }

      const categorySlug = detail.categorySlug ?? card.categorySlug;
      const categoryName = detail.categoryName ?? card.name;
      const categoryId = categorySlug ? await upsertProductCategory(categorySlug, categoryName) : null;

      const storeUrl = new URL(card.detailPath, BASE_URL).toString();
      const priceCents = detail.priceCents ?? card.priceCents;
      const imageUrls = detail.imageUrls.length > 0 ? detail.imageUrls : card.imageUrl ? [card.imageUrl] : [];

      const existing = await prisma.product.findUnique({
        where: { storeProductId: card.storeProductId },
        include: { prices: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            sku: `LOJA-${card.storeProductId}`,
            name: detail.name,
            description: detail.description,
            categoryId,
            active: true,
            source: "IMPORTADO",
            storeProductId: card.storeProductId,
            storeUrl,
            lastSyncedAt: new Date(),
            images: { create: imageUrls.map((url, position) => ({ url, position })) },
            prices: priceCents !== null ? { create: { priceCents, source: "SYNC_LOJA" } } : undefined,
          },
        });
        created++;
        continue;
      }

      const currentPriceCents = existing.prices[0]?.priceCents ?? null;
      const priceChanged = priceCents !== null && priceCents !== currentPriceCents;
      const fieldsChanged =
        existing.name !== detail.name ||
        existing.description !== detail.description ||
        existing.categoryId !== categoryId ||
        existing.storeUrl !== storeUrl;

      if (!priceChanged && !fieldsChanged) {
        // Ainda assim marca lastSyncedAt — confirma que este produto foi
        // conferido nesta execução, mesmo sem mudança de conteúdo.
        await prisma.product.update({ where: { id: existing.id }, data: { lastSyncedAt: new Date() } });
        unchanged++;
        continue;
      }

      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: detail.name,
          description: detail.description,
          categoryId,
          storeUrl,
          lastSyncedAt: new Date(),
          ...(imageUrls.length > 0
            ? { images: { deleteMany: {}, create: imageUrls.map((url, position) => ({ url, position })) } }
            : {}),
        },
      });

      if (priceChanged && priceCents !== null) {
        await prisma.productPrice.create({
          data: { productId: existing.id, priceCents, source: "SYNC_LOJA" },
        });
      }

      updated++;
    } catch (error) {
      errors.push({ context: `produto:${card.storeProductId}`, message: String(error) });
    }
  }

  // Reembedding em lote (não por produto): mesma lógica best-effort de
  // src/modules/ai/reembed.ts, só reembeda o que realmente mudou (hash de
  // conteúdo), sem AI_GATEWAY_API_KEY só loga e segue — nunca derruba o sync.
  if (created + updated > 0) {
    try {
      await reembedAllPending();
    } catch (error) {
      errors.push({ context: "reembed", message: String(error) });
    }
  }

  const result: StoreSyncResult = {
    status: "CONCLUIDO",
    categoriesFound: categories.length,
    productsFound: cardsById.size,
    created,
    updated,
    unchanged,
    errors,
  };

  await prisma.storeSyncRun.update({
    where: { id: run.id },
    data: {
      status: "CONCLUIDO",
      finishedAt: new Date(),
      categoriesFound: result.categoriesFound,
      productsFound: result.productsFound,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
      errors: result.errors,
    },
  });

  return result;
}
