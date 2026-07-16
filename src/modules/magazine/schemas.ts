import { z } from "zod";

export const magazineIssueSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da edição."),
  // Aceita tanto uma URL de upload (Blob) quanto uma URL colada manualmente —
  // o formulário decide qual usar, o schema só valida que é uma URL de verdade.
  pdfUrl: z.string().trim().url("Informe uma URL de PDF válida, ou faça upload."),
  coverImageUrl: z.string().trim().url("URL de imagem inválida.").optional().or(z.literal("")),
});

export type MagazineIssueInput = z.infer<typeof magazineIssueSchema>;
