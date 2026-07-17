import { z } from "zod";

// Magazine V3: "Gerar Magazine" é totalmente automático — sem filtro nem
// ordenação escolhidos pelo admin (busca todos os produtos ativos, ver
// generator.ts). Só o título da edição é digitado.
export const generateMagazineSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
});
export type GenerateMagazineInput = z.infer<typeof generateMagazineSchema>;

export const renameMagazineSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
});
export type RenameMagazineInput = z.infer<typeof renameMagazineSchema>;
