import { z } from "zod";

// Sem validação rígida de formato de telefone de propósito — mesma
// permissividade do `User.phone` já existente. A sanitização pro link
// wa.me/QR Code (só dígitos, com DDI) acontece na hora de montar o link
// (ver src/lib/whatsapp.ts), não aqui.
export const profileSchema = z.object({
  whatsapp: z.string().trim().optional().or(z.literal("")),
  instagram: z.string().trim().optional().or(z.literal("")),
  photoUrl: z.string().trim().url("URL de imagem inválida.").optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;
