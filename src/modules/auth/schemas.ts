import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .regex(/[a-zA-Z]/, "A senha precisa ter pelo menos uma letra.")
    .regex(/[0-9]/, "A senha precisa ter pelo menos um número."),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone válido.")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
});

export type SignupInput = z.infer<typeof signupSchema>;
