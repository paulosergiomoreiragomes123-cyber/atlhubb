import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireApprovedUser } from "@/src/modules/auth/dal";

export const metadata: Metadata = { title: "Painel do Consultor — AtlHub" };

const MODULOS_FUTUROS = [
  { titulo: "Ingestão do Guia Oficial", descricao: "IA passa a citar o Guia Oficial, além do catálogo.", fase: "Fase 4 (quando o documento existir)" },
  { titulo: "Treinamentos, comunicados e promoções", descricao: "Trilhas de treinamento e avisos da Atlântica Natural.", fase: "Depois da Fase 5" },
];

export default async function PainelConsultorPage() {
  const user = await requireApprovedUser();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Bem-vindo(a) ao AtlHub.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/consultor/catalogo">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Catálogo</CardTitle>
              <CardDescription>
                Veja os produtos da Atlântica Natural com preço sempre atualizado, e compartilhe com um QR Code.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/consultor/revista">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Revista digital</CardTitle>
              <CardDescription>
                Edições publicadas da Atlântica Natural, prontas pra ler e compartilhar.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/consultor/assistente-ia">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Assistente IA</CardTitle>
              <CardDescription>
                Recomendações, comparações, kits, copies e legendas — com base no catálogo real.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-muted-foreground">Próximas fases</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS_FUTUROS.map((modulo) => (
            <Card key={modulo.titulo} className="opacity-70">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{modulo.titulo}</CardTitle>
                  <Badge variant="outline">{modulo.fase}</Badge>
                </div>
                <CardDescription>{modulo.descricao}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
