import { z } from "zod";

import { COVER_COLOR_VALUES } from "@/src/modules/magazine/cover-colors";

// Sem validação rígida de formato de telefone de propósito — mesma
// permissividade do `User.phone` já existente. A sanitização pro link
// wa.me/QR Code (só dígitos, com DDI) acontece na hora de montar o link
// (ver src/lib/whatsapp.ts), não aqui.
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome."),
  jobTitle: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  instagram: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  photoUrl: z.string().trim().url("URL de imagem inválida.").optional().or(z.literal("")),
  // Cai pro texto padrão (ver src/lib/whatsapp.ts) quando vazio — nunca
  // obrigatório preencher.
  magazineMessage: z
    .string()
    .trim()
    .max(300, "Mensagem muito longa (máx. 300 caracteres).")
    .optional()
    .or(z.literal("")),
  coverColor: z.enum(COVER_COLOR_VALUES),
  showQrCode: z.boolean(),
  showPhoto: z.boolean(),
  showInstagram: z.boolean(),
  showCity: z.boolean(),
});
export type ProfileInput = z.infer<typeof profileSchema>;
