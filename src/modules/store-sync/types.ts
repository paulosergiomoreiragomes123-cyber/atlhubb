// Sem "server-only" de propósito: importado por scripts/sync-store.ts, um
// script tsx standalone fora do bundler do Next — mesmo motivo de
// src/modules/guide/ingest.ts.

export type StoreCategory = {
  slug: string;
  storeId: string; // id numérico da categoria na loja, ex.: "11"
  name: string;
};

// Card de produto como aparece na listagem paginada de uma categoria.
export type StoreProductCard = {
  storeProductId: string; // "Código" numérico da loja, como string
  name: string;
  priceCents: number | null;
  imageUrl: string | null;
  detailPath: string; // ex.: /produtos/creme-dental-ozonizado
  categorySlug: string;
};

// Ficha completa de um produto, extraída de /produtos/{slug}.
export type StoreProductDetail = {
  storeProductId: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  imageUrls: string[];
  detailPath: string;
};

export type StoreSyncResult = {
  status: "CONCLUIDO" | "ERRO";
  categoriesFound: number;
  productsFound: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: { context: string; message: string }[];
};
