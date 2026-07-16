import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/src/modules/auth/dal";
import { logoutAction } from "@/src/modules/auth/actions";

export const metadata: Metadata = { title: "Aguardando aprovação — AtlHub" };

const MENSAGENS: Record<string, { titulo: string; descricao: string }> = {
  AGUARDANDO: {
    titulo: "Cadastro em análise",
    descricao:
      "Recebemos seu cadastro. Um administrador da Atlântica Natural vai revisar e aprovar seu acesso em breve.",
  },
  REPROVADO: {
    titulo: "Cadastro reprovado",
    descricao:
      "Seu cadastro não foi aprovado. Se acha que isso é um engano, fale com um administrador.",
  },
  SUSPENSO: {
    titulo: "Conta suspensa",
    descricao:
      "Sua conta foi suspensa por um administrador. Fale com a equipe da Atlântica Natural para mais informações.",
  },
};

export default async function AguardandoAprovacaoPage() {
  // Esta página é pública de propósito: a maioria de quem chega aqui acabou
  // de se cadastrar e ainda não tem sessão nenhuma (authorize() bloqueia login
  // de quem não está APROVADO). Se houver sessão, é o caso de alguém que foi
  // suspenso/reprovado no meio de uma sessão já aberta — daí a mensagem varia.
  const user = await getCurrentUser();
  if (user?.status === "APROVADO") redirect("/");
  const info = MENSAGENS[user?.status ?? "AGUARDANDO"] ?? MENSAGENS.AGUARDANDO;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{info.titulo}</CardTitle>
        <CardDescription>{info.descricao}</CardDescription>
      </CardHeader>
      {user ? (
        <CardContent>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Sair
            </Button>
          </form>
        </CardContent>
      ) : (
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Voltar para o login</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
