import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do fornecedor."),
  contactName: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
