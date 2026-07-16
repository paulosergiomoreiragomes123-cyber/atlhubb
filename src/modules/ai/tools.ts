import "server-only";
import { tool } from "ai";
import { z } from "zod";

import { prisma } from "@/src/lib/prisma";
import { searchProducts } from "@/src/modules/ai/search";
import { getStockForProduct, getStockMap } from "@/src/modules/stock/queries";
import { listCategoriesForSelect } from "@/src/modules/categories/queries";
import { listBrandsForSelect } from "@/src/modules/brands/queries";
import { searchGuideChunks } from "@/src/modules/guide/search";

// Nenhuma tool escreve no banco — o assistente é somente-leitura por desenho.
// Isso é o que garante que a IA nunca altera catálogo/preço/estoque sozinha.

export const searchProductsTool = tool({
  description:
    "Busca produtos ativos do catálogo da Atlântica Natural por texto (nome, descrição, SKU) e/ou filtros (categoria, marca, faixa de preço). Use antes de recomendar, comparar ou responder qualquer pergunta sobre produtos — nunca cite um produto sem ter chamado esta ferramenta primeiro.",
  inputSchema: z.object({
    query: z.string().optional().describe("Texto livre da busca, ex.: 'perfume amadeirado para o inverno'."),
    categoryId: z.string().optional(),
    brandId: z.string().optional(),
    minPriceCents: z.number().int().optional().describe("Preço mínimo em centavos."),
    maxPriceCents: z.number().int().optional().describe("Preço máximo em centavos."),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  execute: async (input) => {
    const results = await searchProducts({ ...input, activeOnly: true });
    return {
      count: results.length,
      products: results,
    };
  },
});

export const getProductDetailsTool = tool({
  description:
    "Busca os detalhes completos de UM produto específico (preço atual, estoque, imagens, atributos) pelo ID ou SKU. Use depois de já ter encontrado o produto via searchProducts, ou quando o consultor citar um SKU diretamente.",
  inputSchema: z.object({
    productId: z.string().optional(),
    sku: z.string().optional(),
  }),
  execute: async ({ productId, sku }) => {
    if (!productId && !sku) {
      return { found: false, message: "Informe productId ou sku." };
    }

    const product = await prisma.product.findFirst({
      where: productId ? { id: productId } : { sku },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        supplier: { select: { name: true } },
        images: { orderBy: { position: "asc" }, select: { url: true } },
        prices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
    });

    if (!product || !product.active) {
      return { found: false, message: "Produto não encontrado ou inativo." };
    }

    const stock = await getStockForProduct(product.id);

    return {
      found: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category?.name ?? null,
        brand: product.brand?.name ?? null,
        supplier: product.supplier?.name ?? null,
        attributes: product.attributes,
        priceCents: product.prices[0]?.priceCents ?? null,
        stock,
        images: product.images.map((i) => i.url),
        // Fase 6A — só presente pra produtos sincronizados da loja pública
        // (source: IMPORTADO); null pra produtos MANUAL. Use pra montar o
        // link "Comprar" na resposta.
        storeUrl: product.storeUrl,
      },
    };
  },
});

export const compareProductsTool = tool({
  description:
    "Busca os detalhes de VÁRIOS produtos ao mesmo tempo (2 a 5) para montar uma comparação lado a lado — use para 'compare X e Y' ou ao montar sugestão de kit com produtos específicos já identificados.",
  inputSchema: z.object({
    productIds: z.array(z.string()).min(2).max(5),
  }),
  execute: async ({ productIds }) => {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        prices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    });

    const stockMap = await getStockMap(products.map((p) => p.id));

    return {
      count: products.length,
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category?.name ?? null,
        brand: p.brand?.name ?? null,
        attributes: p.attributes,
        priceCents: p.prices[0]?.priceCents ?? null,
        stock: stockMap.get(p.id) ?? 0,
        storeUrl: p.storeUrl,
        imageUrl: p.images[0]?.url ?? null,
      })),
    };
  },
});

export const listCategoriesTool = tool({
  description: "Lista todas as categorias de produto disponíveis no catálogo.",
  inputSchema: z.object({}),
  execute: async () => ({ categories: await listCategoriesForSelect() }),
});

export const listBrandsTool = tool({
  description: "Lista todas as marcas disponíveis no catálogo.",
  inputSchema: z.object({}),
  execute: async () => ({ brands: await listBrandsForSelect() }),
});

export const getGuideContentTool = tool({
  description:
    "Busca trechos do Guia Oficial da Atlântica Natural relevantes para a pergunta do consultor — políticas, modo de uso/aplicação de produto, orientações e informações oficiais da empresa. Use quando a pergunta for sobre orientação oficial, não apenas dado de produto/preço/estoque (para isso, use searchProducts/getProductDetails).",
  inputSchema: z.object({
    query: z.string().describe("Pergunta ou tema a buscar no Guia, ex.: 'como aplicar o sérum facial'."),
  }),
  execute: async ({ query }) => {
    const chunks = await searchGuideChunks(query);
    return { count: chunks.length, chunks };
  },
});

export const atlhubTools = {
  searchProducts: searchProductsTool,
  getProductDetails: getProductDetailsTool,
  compareProducts: compareProductsTool,
  listCategories: listCategoriesTool,
  listBrands: listBrandsTool,
  getGuideContent: getGuideContentTool,
};
