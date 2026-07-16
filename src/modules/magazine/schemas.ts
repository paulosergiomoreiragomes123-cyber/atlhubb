import { z } from "zod";

// Rótulos em pt-BR — uma única fonte, reaproveitada pelo form e por
// qualquer lugar que precise mostrar o filtro de forma legível.
export const MAGAZINE_FILTER_LABELS = {
  TODOS: "Todos os produtos",
  LANCAMENTOS: "Lançamentos",
  PROMOCOES: "Promoções",
  PERFUMES: "Perfumes",
  SUPLEMENTOS: "Suplementos",
  COSMETICOS: "Cosméticos",
} as const;

export const MAGAZINE_FILTER_VALUES = [
  "TODOS",
  "LANCAMENTOS",
  "PROMOCOES",
  "PERFUMES",
  "SUPLEMENTOS",
  "COSMETICOS",
] as const;

// MAIS_VENDIDOS aparece na UI (foi pedido), mas não existe dado de venda em
// lugar nenhum do sistema — generator.ts trata como NOME. O rótulo já deixa
// isso visível pra não parecer uma métrica de verdade.
export const MAGAZINE_SORT_LABELS = {
  LANCAMENTOS: "Lançamentos",
  MAIS_VENDIDOS: "Mais vendidos (em breve — sem dados de venda ainda)",
  NOME: "Nome",
  PRECO: "Preço",
} as const;

export const MAGAZINE_SORT_VALUES = ["LANCAMENTOS", "MAIS_VENDIDOS", "NOME", "PRECO"] as const;

export const generateMagazineSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
  filterTypes: z.array(z.enum(MAGAZINE_FILTER_VALUES)).min(1, "Marque ao menos um filtro."),
  sortBy: z.enum(MAGAZINE_SORT_VALUES),
});
export type GenerateMagazineInput = z.infer<typeof generateMagazineSchema>;

export const renameMagazineSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
});
export type RenameMagazineInput = z.infer<typeof renameMagazineSchema>;
