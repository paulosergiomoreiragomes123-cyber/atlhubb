import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da marca."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens."),
  logoUrl: z.string().trim().url("URL de logo inválida.").optional().or(z.literal("")),
});

export type BrandInput = z.infer<typeof brandSchema>;
