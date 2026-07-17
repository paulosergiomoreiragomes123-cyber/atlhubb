import "server-only";
import { prisma } from "@/src/lib/prisma";
import { findGuideMatchForProduct } from "@/src/modules/magazine/guide-matching";
import {
  normalizePerfumeName,
  stripVolumeFromName,
  extractPerfumeVolumeLabel,
  PERFUME_LINE_CARE_TEXT,
} from "@/src/modules/magazine/perfume-matching";
import type { PerfumeGender } from "@/src/generated/prisma/client";

// Categoria real da loja que reúne todos os perfumes Bortoletto (96
// produtos sincronizados, ver PROJECT.md) — a única com casamento real
// contra as duas tabelas olfativas oficiais.
const PERFUME_CATEGORY_SLUG = "perfume-bortoletto";

// "Lançamentos" é uma seção cruzada por data, não uma categoria real —
// mesmo critério da Fase 7 (30 dias desde a sincronização). Só aparece
// quando é uma seleção de verdade minoritária do catálogo: testado ao vivo
// e, logo após uma sincronização em massa (todo o catálogo importado de
// uma vez, todos com createdAt recente), a janela de 30 dias pegava 100%
// dos produtos — uma seção "Lançamentos" que é o catálogo inteiro não
// destaca nada de verdade, mesmo princípio de nunca fingir "Mais vendidos"
// sem dado real (ver PROJECT.md). Um limiar simples evita essa duplicata.
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const LAUNCHES_MAX_SHARE = 0.5;

const VOLUME_PATTERN = /\b(\d+(?:[.,]\d+)?\s?(?:ml|g|kg|l))\b/i;
function extractVolume(name: string): string | null {
  const match = name.match(VOLUME_PATTERN);
  return match ? match[1].replace(/\s+/g, "") : null;
}

export type PerfumeSnapshotInfo = {
  gender: PerfumeGender;
  inspiredBy: string | null;
  olfactoryCategory: string | null;
  topNotes: string | null;
  heartNotes: string | null;
  baseNotes: string | null;
  occasion: string | null;
  ranking: string | null;
  volumePrices: Record<string, number>; // ex.: { "15ml": 3990, "100ml": 12990 } — só volumes que existem de verdade
  careText: string;
};

// Snapshot ponto-no-tempo (mesma filosofia de Conversation.messages) — um
// item por produto (ou, no caso de perfume, um item por FRAGRÂNCIA já
// agrupando as variações de volume sincronizadas). `compareAtPriceCents`
// vem do histórico REAL de preço (nunca inventado — ver PROJECT.md): hoje é
// sempre null porque nenhum produto tem mais de uma linha de preço ainda,
// mas o campo já existe e passa a preencher sozinho no dia em que um preço
// cair de verdade num sync futuro.
export type ProductSnapshotItem = {
  productId: string;
  sku: string;
  name: string;
  priceCents: number | null;
  compareAtPriceCents: number | null;
  imageUrl: string | null;
  storeUrl: string | null;
  categoryName: string | null;
  volume: string | null;
  description: string | null;
  benefits: string | null;
  howToUse: string | null;
  ingredients: string | null;
  perfume: PerfumeSnapshotInfo | null;
};

export type MagazineSection = {
  key: string;
  title: string;
  products: ProductSnapshotItem[];
};

export type MagazineSnapshot = {
  sections: MagazineSection[];
};

// Nomes de exibição pra categorias reais que já tinham um agrupamento
// aceito desde a Fase 7 (Suplementos = nutraceuticos, Cosméticos =
// cosmetico-ozonizado) — qualquer outra categoria real usa o próprio nome
// da loja, sem inventar rótulo novo.
// Colapsa espaço duplo e converte ALL CAPS pra Title Case só quando a
// própria categoria da loja vem gritada (ex.: "ÓLEOS ESSENCIAIS", "WAVE
// GLOBAL") — cosmético, não muda o nome real, só a forma de exibir.
function tidyCategoryName(name: string): string {
  const collapsed = name.replace(/\s+/g, " ").trim();
  if (collapsed !== collapsed.toUpperCase()) return collapsed;
  return collapsed
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function categoryDisplayName(categoryName: string, categorySlug: string): string {
  if (categorySlug === "nutraceuticos") return "Suplementos";
  if (categorySlug === "cosmetico-ozonizado") return "Cosméticos";
  return tidyCategoryName(categoryName);
}

const productListInclude = {
  category: { select: { name: true, slug: true } },
  prices: { orderBy: { effectiveFrom: "desc" as const }, take: 2 },
  images: { orderBy: { position: "asc" as const }, take: 1 },
};

type ProductWithRelations = Awaited<ReturnType<typeof fetchActiveProducts>>[number];

function fetchActiveProducts() {
  return prisma.product.findMany({ where: { active: true }, include: productListInclude });
}

function computePrices(product: ProductWithRelations): { priceCents: number | null; compareAtPriceCents: number | null } {
  const [latest, previous] = product.prices;
  const priceCents = latest?.priceCents ?? null;
  // "De/Por" só quando o histórico REAL mostra uma queda de preço — nunca
  // inventado (ver PROJECT.md, decisão do cliente 2026-07-16). Hoje sempre
  // null: nenhum produto tem 2+ linhas de ProductPrice ainda.
  const compareAtPriceCents =
    priceCents !== null && previous && previous.priceCents > priceCents ? previous.priceCents : null;
  return { priceCents, compareAtPriceCents };
}

async function buildRegularSnapshotItem(product: ProductWithRelations): Promise<ProductSnapshotItem> {
  const { priceCents, compareAtPriceCents } = computePrices(product);
  const guideMatch = await findGuideMatchForProduct(product.name);

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    priceCents,
    compareAtPriceCents,
    imageUrl: product.images[0]?.url ?? null,
    storeUrl: product.storeUrl,
    categoryName: product.category?.name ?? null,
    volume: extractVolume(product.name),
    description: guideMatch.description,
    benefits: guideMatch.benefits,
    howToUse: guideMatch.howToUse,
    ingredients: guideMatch.ingredients,
    perfume: null,
  };
}

// Agrupa produtos de perfume pela fragrância-base (15ml + 100ml viram UM
// item de catálogo) e casa cada grupo com o PerfumeProfile oficial —
// casamento por nome normalizado, exato, sem fuzzy (ver perfume-matching.ts).
// Sem perfil casado em nenhum gênero, o grupo ainda aparece (foto/nome/
// preço reais) só sem os campos olfativos — nunca inventa gênero.
async function buildPerfumeSections(
  perfumeProducts: ProductWithRelations[]
): Promise<{ masculino: ProductSnapshotItem[]; feminino: ProductSnapshotItem[]; semGenero: ProductSnapshotItem[] }> {
  const profiles = await prisma.perfumeProfile.findMany();
  const profileByKey = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) {
    profileByKey.set(`${profile.gender}:${normalizePerfumeName(profile.name)}`, profile);
  }

  type Group = { representative: ProductWithRelations; volumePrices: Record<string, number> };
  const groups = new Map<string, Group>();

  for (const product of perfumeProducts) {
    const key = normalizePerfumeName(product.name);
    const { priceCents } = computePrices(product);
    const volumeLabel = extractPerfumeVolumeLabel(product.name) ?? "único";

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        representative: product,
        volumePrices: priceCents !== null ? { [volumeLabel]: priceCents } : {},
      });
    } else {
      if (priceCents !== null) existing.volumePrices[volumeLabel] = priceCents;
      // Prefere a variante 100ml como foto de capa do card (mais provável
      // de ter uma foto de produto melhor enquadrada) quando existir.
      if (volumeLabel === "100ml") existing.representative = product;
    }
  }

  const masculino: ProductSnapshotItem[] = [];
  const feminino: ProductSnapshotItem[] = [];
  const semGenero: ProductSnapshotItem[] = [];

  for (const [key, group] of groups) {
    const profileMasc = profileByKey.get(`MASCULINO:${key}`);
    const profileFem = profileByKey.get(`FEMININO:${key}`);
    const profile = profileMasc ?? profileFem;

    const item: ProductSnapshotItem = {
      productId: group.representative.id,
      sku: group.representative.sku,
      name: stripVolumeFromName(group.representative.name),
      priceCents: null,
      compareAtPriceCents: null,
      imageUrl: group.representative.images[0]?.url ?? null,
      storeUrl: group.representative.storeUrl,
      categoryName: group.representative.category?.name ?? null,
      volume: null,
      description: null,
      benefits: null,
      howToUse: null,
      ingredients: null,
      perfume: {
        gender: profile?.gender ?? (profileMasc ? "MASCULINO" : "FEMININO"),
        inspiredBy: profile?.inspiredBy ?? null,
        olfactoryCategory: profile?.olfactoryCategory ?? null,
        topNotes: profile?.topNotes ?? null,
        heartNotes: profile?.heartNotes ?? null,
        baseNotes: profile?.baseNotes ?? null,
        occasion: profile?.occasion ?? null,
        ranking: profile?.ranking ?? null,
        volumePrices: group.volumePrices,
        careText: PERFUME_LINE_CARE_TEXT,
      },
    };

    if (!profile) {
      semGenero.push(item);
    } else if (profile.gender === "MASCULINO") {
      masculino.push(item);
    } else {
      feminino.push(item);
    }
  }

  const byName = (a: ProductSnapshotItem, b: ProductSnapshotItem) => a.name.localeCompare(b.name, "pt-BR");
  return {
    masculino: masculino.sort(byName),
    feminino: feminino.sort(byName),
    semGenero: semGenero.sort(byName),
  };
}

// Usado pela Magazine V4 (revista oficial reaproveitada, ver
// official-pdf-assembler.ts): busca só os SKUs específicos mapeados numa
// página da edição impressa (não o catálogo inteiro) e devolve o mesmo
// enriquecimento (preço atual, Guia, perfil de perfume) indexado por SKU.
export async function buildEnrichmentBySku(skus: string[]): Promise<Map<string, ProductSnapshotItem>> {
  if (skus.length === 0) return new Map();

  const products = await prisma.product.findMany({ where: { sku: { in: skus } }, include: productListInclude });
  const perfumeProducts = products.filter((p) => p.category?.slug === PERFUME_CATEGORY_SLUG);
  const regularProducts = products.filter((p) => p.category?.slug !== PERFUME_CATEGORY_SLUG);

  const result = new Map<string, ProductSnapshotItem>();

  for (const product of regularProducts) {
    result.set(product.sku, await buildRegularSnapshotItem(product));
  }

  if (perfumeProducts.length > 0) {
    const { masculino, feminino, semGenero } = await buildPerfumeSections(perfumeProducts);
    for (const item of [...masculino, ...feminino, ...semGenero]) {
      result.set(item.sku, item);
    }
  }

  return result;
}

export async function buildMagazineSnapshot(): Promise<MagazineSnapshot> {
  const allProducts = await fetchActiveProducts();

  const perfumeProducts = allProducts.filter((p) => p.category?.slug === PERFUME_CATEGORY_SLUG);
  const regularProducts = allProducts.filter((p) => p.category?.slug !== PERFUME_CATEGORY_SLUG);

  // "Lançamentos": produtos (não-perfume) sincronizados nos últimos 30 dias
  // — seção cruzada, não uma categoria real. Perfumes ficam de fora dessa
  // seção de propósito: têm o fluxo próprio (páginas especiais + catálogo
  // ao final), não fazem sentido duplicados também em Lançamentos.
  const launchCutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const recentlyAdded = regularProducts.filter((p) => p.createdAt >= launchCutoff);
  const launches =
    regularProducts.length > 0 && recentlyAdded.length / regularProducts.length <= LAUNCHES_MAX_SHARE
      ? recentlyAdded
      : [];

  const byRealCategory = new Map<string, ProductWithRelations[]>();
  for (const product of regularProducts) {
    if (!product.category) continue;
    const list = byRealCategory.get(product.category.slug) ?? [];
    list.push(product);
    byRealCategory.set(product.category.slug, list);
  }

  const sections: MagazineSection[] = [];

  if (launches.length > 0) {
    sections.push({
      key: "lancamentos",
      title: "Lançamentos",
      products: await Promise.all(launches.map(buildRegularSnapshotItem)),
    });
  }

  // Ordem fixa pras categorias mais relevantes primeiro; qualquer categoria
  // real nova que a loja sincronizar aparece depois, sem precisar editar
  // essa lista (fallback alfabético por slug).
  const PRIORITY_SLUGS = ["nutraceuticos", "cosmetico-ozonizado", "oleos-essenciais", "vitaminas", "academia"];
  const remainingSlugs = [...byRealCategory.keys()]
    .filter((slug) => !PRIORITY_SLUGS.includes(slug))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const orderedSlugs = [...PRIORITY_SLUGS.filter((slug) => byRealCategory.has(slug)), ...remainingSlugs];

  for (const slug of orderedSlugs) {
    const products = byRealCategory.get(slug)!;
    const categoryName = products[0].category!.name;
    sections.push({
      key: slug,
      title: categoryDisplayName(categoryName, slug),
      products: await Promise.all(products.map(buildRegularSnapshotItem)),
    });
  }

  // Perfumes sempre por último — a leitura web (MagazineView) tem duas
  // páginas especiais (tabelas olfativas oficiais) antes do catálogo. O
  // PDF baixado (Magazine V4) usa esse mesmo enriquecimento por SKU
  // específico via buildEnrichmentBySku, não esta lista de seções.
  if (perfumeProducts.length > 0) {
    const { masculino, feminino, semGenero } = await buildPerfumeSections(perfumeProducts);
    if (masculino.length > 0) sections.push({ key: "perfumes-masculinos", title: "Perfumes Masculinos", products: masculino });
    if (feminino.length > 0) sections.push({ key: "perfumes-femininos", title: "Perfumes Femininos", products: feminino });
    if (semGenero.length > 0) sections.push({ key: "perfumes-outros", title: "Outros Perfumes", products: semGenero });
  }

  return { sections };
}
