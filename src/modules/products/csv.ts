import "server-only";
import Papa from "papaparse";

// Formato do CSV de import/export em lote — a alternativa manual à
// sincronização automática com uma loja externa (ver PROJECT.md seção 13:
// a Atlântica Natural usa uma plataforma própria, sem integração por ora).
// `image_urls`: várias URLs separadas por "|" (uma célula de CSV não separa
// bem listas de outro jeito sem parser aninhado).
// `stock`: quantidade ABSOLUTA desejada, não um delta — o import calcula a
// diferença e registra como um movimento de estoque tipo AJUSTE.
export const CSV_COLUMNS = [
  "sku",
  "name",
  "description",
  "category_slug",
  "brand_slug",
  "supplier_name",
  "price",
  "stock",
  "active",
  "image_urls",
] as const;

export type ProductCsvRow = {
  line: number;
  sku: string;
  name: string;
  description: string;
  categorySlug: string;
  brandSlug: string;
  supplierName: string;
  priceInput: string;
  stockInput: string;
  active: boolean;
  imageUrls: string[];
};

export type ProductCsvParseResult = {
  rows: ProductCsvRow[];
  errors: { line: number; message: string }[];
};

function parseActiveFlag(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") return true;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "sim", "yes", "ativo"].includes(normalized);
}

export function parseProductsCsv(text: string): ProductCsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: ProductCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];

  parsed.data.forEach((raw, index) => {
    const line = index + 2; // +1 pelo cabeçalho, +1 porque planilha começa em 1

    const sku = (raw.sku ?? "").trim();
    const name = (raw.name ?? "").trim();

    if (!sku) {
      errors.push({ line, message: "SKU vazio — linha ignorada." });
      return;
    }
    if (!name) {
      errors.push({ line, message: "Nome vazio — linha ignorada." });
      return;
    }

    rows.push({
      line,
      sku,
      name,
      description: (raw.description ?? "").trim(),
      categorySlug: (raw.category_slug ?? "").trim(),
      brandSlug: (raw.brand_slug ?? "").trim(),
      supplierName: (raw.supplier_name ?? "").trim(),
      priceInput: (raw.price ?? "").trim(),
      stockInput: (raw.stock ?? "").trim(),
      active: parseActiveFlag(raw.active),
      imageUrls: (raw.image_urls ?? "")
        .split("|")
        .map((url) => url.trim())
        .filter(Boolean),
    });
  });

  for (const parseError of parsed.errors) {
    errors.push({
      line: (parseError.row ?? 0) + 2,
      message: parseError.message,
    });
  }

  return { rows, errors };
}

// Mitigação de CSV/Formula Injection: se um valor livre (nome, descrição,
// fornecedor) começar com =, +, -, @ ou tab, o Excel/Sheets pode interpretar
// como fórmula ao abrir o arquivo exportado. Prefixar com aspas simples força
// leitura como texto, sem mudar o valor visível pra quem lê a célula.
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t]/;

function sanitizeCsvCell(value: string): string {
  return FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

export function buildProductsCsv(
  products: {
    sku: string;
    name: string;
    description: string | null;
    active: boolean;
    category: { slug: string } | null;
    brand: { slug: string } | null;
    supplier: { name: string } | null;
    prices: { priceCents: number }[];
    images: { url: string }[];
    stock: number;
  }[]
): string {
  const rows = products.map((product) => ({
    sku: product.sku,
    name: sanitizeCsvCell(product.name),
    description: sanitizeCsvCell(product.description ?? ""),
    category_slug: product.category?.slug ?? "",
    brand_slug: product.brand?.slug ?? "",
    supplier_name: sanitizeCsvCell(product.supplier?.name ?? ""),
    price: product.prices[0] ? (product.prices[0].priceCents / 100).toFixed(2) : "",
    stock: String(product.stock),
    active: product.active ? "true" : "false",
    image_urls: product.images.map((i) => i.url).join("|"),
  }));

  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}
