import { z } from "zod";

// Rótulos em pt-BR pro Select do admin e pra exibição — uma única fonte,
// reaproveitada pelo form e por qualquer lugar que precise mostrar o filtro
// de forma legível (ex.: card da edição).
export const MAGAZINE_FILTER_LABELS = {
  TODOS: "Todos os produtos",
  LANCAMENTOS: "Apenas lançamentos",
  PROMOCOES: "Apenas promoções",
  PERFUMES: "Apenas perfumes",
  SUPLEMENTOS: "Apenas suplementos",
} as const;

export const MAGAZINE_FILTER_VALUES = [
  "TODOS",
  "LANCAMENTOS",
  "PROMOCOES",
  "PERFUMES",
  "SUPLEMENTOS",
] as const;

export const generateMagazineSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
  filterType: z.enum(MAGAZINE_FILTER_VALUES),
});
export type GenerateMagazineInput = z.infer<typeof generateMagazineSchema>;

export const renameMagazineSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
});
export type RenameMagazineInput = z.infer<typeof renameMagazineSchema>;
