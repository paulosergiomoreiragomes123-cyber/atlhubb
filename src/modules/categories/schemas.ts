import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens."),
  parentId: z.string().optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
