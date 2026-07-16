"use server";

import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { hashPassword } from "@/src/lib/password";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/src/modules/auth/schemas";
import { mensagemDeErroDeLogin } from "@/src/modules/auth/errors";

export type ActionResult = { message: string } | void;

// Só aceita um caminho relativo local como destino pós-login (ex.: "/admin/produtos").
// Rejeita URLs absolutas e "//host" (protocol-relative) — ambas seriam um open redirect
// se a gente confiasse cegamente no callbackUrl que o proxy.ts recebeu na querystring.
function safeCallbackPath(callbackUrl: string | undefined): string {
  if (!callbackUrl) return "/";
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) return "/";
  return callbackUrl;
}

// Os formulários validam no cliente com o mesmo schema Zod (via react-hook-form),
// mas a Server Action nunca confia no cliente: revalida tudo aqui antes de tocar o banco.
export async function loginAction(input: LoginInput, callbackUrl?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira o e-mail e a senha." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { message: mensagemDeErroDeLogin(error.code) };
    }
    if (error instanceof AuthError) {
      return { message: "Não foi possível entrar. Tente novamente." };
    }
    throw error;
  }

  redirect(safeCallbackPath(callbackUrl));
}

export async function signupAction(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Dados inválidos. Confira os campos e tente de novo." };
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { message: "Já existe um cadastro com esse e-mail." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      // role/status usam os defaults do schema: CONSULTOR / AGUARDANDO.
    },
  });

  // Sem login automático: a conta ainda não foi aprovada, então não existe
  // sessão válida pra criar (o próprio authorize() bloquearia mesmo assim).
  redirect("/aguardando-aprovacao");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
