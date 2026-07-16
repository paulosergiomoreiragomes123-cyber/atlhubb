import crypto from "node:crypto";

// Sem "server-only" de propósito: precisa ser importável por scripts tsx
// standalone (scripts/reembed-all.ts) fora do bundler do Next — o mesmo
// motivo pelo qual prisma/seed.ts evita importar módulos "server-only".

export function buildProductEmbeddingText(product: {
  name: string;
  description: string | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  attributes?: unknown;
}): string {
  const parts = [
    product.name,
    product.description ?? "",
    product.category?.name ? `Categoria: ${product.category.name}` : "",
    product.brand?.name ? `Marca: ${product.brand.name}` : "",
    product.attributes ? `Atributos: ${JSON.stringify(product.attributes)}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
