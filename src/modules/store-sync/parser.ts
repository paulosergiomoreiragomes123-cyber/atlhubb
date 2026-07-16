import * as cheerio from "cheerio";

import type { StoreCategory, StoreProductCard, StoreProductDetail } from "@/src/modules/store-sync/types";

// Seletores confirmados por inspeção direta do HTML real da loja (ver
// PROJECT.md, seção Fase 6A) — não são um palpite. Cada função devolve
// `null`/pula item silenciosamente (com log) quando a estrutura não bate, em
// vez de lançar e derrubar a sincronização inteira: é isso que torna o
// crawler resiliente a pequenas mudanças de HTML no futuro, em vez de
// "scraping frágil" que quebra no primeiro ajuste visual do site.

function parseBRLPriceToCents(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.replace(/\s+/g, " ").match(/(\d{1,3}(?:\.\d{3})*),(\d{2})/);
  if (!match) return null;
  const [, intPart, centsPart] = match;
  const cents = Number.parseInt(intPart.replace(/\./g, ""), 10) * 100 + Number.parseInt(centsPart, 10);
  return Number.isFinite(cents) ? cents : null;
}

function absoluteStoreUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

// Extrai as categorias do menu de navegação da home — usado como ponto de
// partida da sincronização (categoria por categoria). Se a loja adicionar/
// remover uma categoria, o próximo sync já reflete isso automaticamente
// (não é uma lista hardcoded fora de alcance).
export function parseCategoryNav(html: string): StoreCategory[] {
  const $ = cheerio.load(html);
  const found = new Map<string, StoreCategory>();

  $('a[href*="/produtos/categoria/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const match = href.match(/\/produtos\/categoria\/([a-z0-9-]+)\/(\d+)/i);
    if (!match) return;

    const [, slug, storeId] = match;
    const name = $(el).text().trim();
    if (!name || found.has(slug)) return;

    found.set(slug, { slug, storeId, name });
  });

  return [...found.values()];
}

// Listagem paginada de uma categoria: `div.product` com `data-produto` (id
// numérico da loja) em `.product_info` — bloco confirmado ao vivo em
// /produtos/categoria/{slug}/{id}?pagina=&quantidade=&ordenacao=Latest.
export function parseCategoryListingPage(
  html: string,
  categorySlug: string,
  baseUrl: string
): StoreProductCard[] {
  const $ = cheerio.load(html);
  const cards: StoreProductCard[] = [];

  $("div.product").each((_, el) => {
    const card = $(el);
    const storeProductId = card.find(".product_info[data-produto]").attr("data-produto");
    const detailHref = card.find(".product_img a").attr("href");
    const name = card.find(".product_title a").first().text().trim();
    const priceText = card.find(".product_price .price").first().text();
    const imageSrc = card.find(".product_img img").attr("src");

    if (!storeProductId || !detailHref || !name) {
      console.warn("[store-sync] Card de produto sem id/link/nome, pulando:", { categorySlug });
      return;
    }

    cards.push({
      storeProductId,
      name,
      priceCents: parseBRLPriceToCents(priceText),
      imageUrl: imageSrc ? absoluteStoreUrl(imageSrc, baseUrl) : null,
      detailPath: new URL(absoluteStoreUrl(detailHref, baseUrl)).pathname,
      categorySlug,
    });
  });

  return cards;
}

// Detecta a última página numerada na paginação (`.pagination .page-item .page-link`
// com texto numérico) — usado só como fallback se um categoria tiver mais
// produtos do que o `quantidade` grande pedido numa única página consegue
// trazer (ver src/modules/store-sync/sync.ts).
export function parseLastPageNumber(html: string): number {
  const $ = cheerio.load(html);
  let last = 1;

  $(".pagination .page-item .page-link").each((_, el) => {
    const text = $(el).text().trim();
    const n = Number.parseInt(text, 10);
    if (Number.isFinite(n) && n > last) last = n;
  });

  return last;
}

// Ficha completa do produto (/produtos/{slug}). `storeProductId` já vem do
// card da listagem (mais confiável do que re-extrair da ficha), então essa
// função só cobre o que a listagem não tem: descrição e galeria completa.
export function parseProductDetailPage(html: string, baseUrl: string): Omit<StoreProductDetail, "storeProductId" | "detailPath"> | null {
  const $ = cheerio.load(html);

  // Escopo explícito no bloco de detalhe principal (`.product_view_description
  // .product_description`) — a mesma página também lista "produtos
  // relacionados" reusando a classe `.product_title`/`.pr_desc`, então sem
  // esse escopo o parser pegaria o primeiro produto relacionado por engano.
  const detail = $(".product_view_description .product_description").first();
  if (detail.length === 0) {
    console.warn("[store-sync] Página de produto sem bloco .product_description, pulando.");
    return null;
  }

  const name = detail.find("h4.product_title").first().text().trim();
  if (!name) {
    console.warn("[store-sync] Página de produto sem título, pulando.");
    return null;
  }

  const priceCents = parseBRLPriceToCents(detail.find(".product_price .price").first().text());
  const description = detail.find(".pr_desc").first().text().trim() || null;

  const breadcrumbCategoryLink = $(".breadcrumb .breadcrumb-item a")
    .filter((_, el) => /\/produtos\/categoria\//.test($(el).attr("href") ?? ""))
    .first();
  const categoryHref = breadcrumbCategoryLink.attr("href");
  const categoryMatch = categoryHref?.match(/\/produtos\/categoria\/([a-z0-9-]+)\/(\d+)/i);

  const imageUrls = new Set<string>();
  const mainImage = $(".product_img_box img#product_img").attr("src");
  if (mainImage) imageUrls.add(absoluteStoreUrl(mainImage, baseUrl));
  $("#pr_item_gallery [data-image]").each((_, el) => {
    const src = $(el).attr("data-image");
    if (src) imageUrls.add(absoluteStoreUrl(src, baseUrl));
  });

  return {
    name,
    description,
    priceCents,
    categoryName: breadcrumbCategoryLink.text().trim() || null,
    categorySlug: categoryMatch?.[1] ?? null,
    imageUrls: [...imageUrls],
  };
}
