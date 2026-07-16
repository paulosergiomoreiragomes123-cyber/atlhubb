import { z } from "zod";
import { parseCentsFromInput } from "@/src/lib/currency";

const priceInputField = z
  .string()
  .trim()
  .min(1, "Informe o preço.")
  .refine(
    (value) => {
      const cents = parseCentsFromInput(value);
      return cents !== null && cents > 0;
    },
    { message: "Informe um preço válido, ex.: 19,90." }
  );

const imageUrlField = z.string().trim().url("URL de imagem inválida.");

// Texto livre em formato JSON (notas olfativas, família, intensidade etc.) —
// usado tanto na ficha do produto quanto no texto do embedding (Fase 4/IA).
// Fica como string no formulário (edição livre) e é convertido pra objeto só
// na Server Action, pra não obrigar o admin a escrever JSON perfeito a cada tecla.
const attributesInputField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    },
    { message: 'Precisa ser um objeto JSON válido, ex.: {"notas": "cítrico"}.' }
  );

// Campos do produto em si — não inclui preço nem estoque, porque nenhum dos
// dois é "um campo do produto": preço é sempre uma nova linha em ProductPrice,
// estoque é sempre uma nova linha em StockMovement (ver schema.prisma).
export const productDetailsSchema = z.object({
  sku: z.string().trim().min(1, "Informe o SKU."),
  name: z.string().trim().min(2, "Informe o nome do produto."),
  description: z.string().trim().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  active: z.boolean(),
  imageUrls: z.array(imageUrlField).max(10, "No máximo 10 imagens por produto."),
  attributesInput: attributesInputField,
});

export type ProductDetailsInput = z.infer<typeof productDetailsSchema>;

// Só na criação preço e estoque entram junto: todo produto nasce com um
// preço inicial; estoque inicial é opcional (fica 0 se não informado).
export const createProductSchema = productDetailsSchema.extend({
  priceInput: priceInputField,
  initialStock: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^\d+$/.test(value), {
      message: "Estoque inicial precisa ser um número inteiro.",
    }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const priceAdjustmentSchema = z.object({
  priceInput: priceInputField,
});

export type PriceAdjustmentInput = z.infer<typeof priceAdjustmentSchema>;

// Só ENTRADA/SAIDA aqui de propósito: são os dois movimentos que um humano
// registra ("chegou X", "saiu X"). AJUSTE (corrigir pra uma quantidade
// absoluta) é calculado internamente a partir da diferença — ver
// setStockAction e o import de CSV — não é algo que o formulário pede direto,
// pra não ter dois jeitos de dizer a mesma coisa (delta vs. absoluto) na mesma tela.
export const stockAdjustmentSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade.")
    .regex(/^\d+$/, "Quantidade precisa ser um número inteiro positivo."),
  reason: z.enum(["ENTRADA", "SAIDA"]),
  note: z.string().trim().optional().or(z.literal("")),
});

export const stockCorrectionSchema = z.object({
  targetQuantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade correta.")
    .regex(/^\d+$/, "Quantidade precisa ser um número inteiro (0 ou mais)."),
  note: z.string().trim().optional().or(z.literal("")),
});

export type StockCorrectionInput = z.infer<typeof stockCorrectionSchema>;

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
