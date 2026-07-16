import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createConversationAction } from "@/src/modules/ai/actions";
import { requireApprovedUser } from "@/src/modules/auth/dal";

export const metadata: Metadata = { title: "Assistente IA — AtlHub" };

export default async function AssistenteIaPage() {
  await requireApprovedUser();

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Assistente de IA da Atlântica Natural</CardTitle>
          <CardDescription>
            Recomenda produtos, compara perfumes, sugere kits, responde
            dúvidas e gera copies/legendas — sempre com base no catálogo real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createConversationAction}>
            <Button type="submit" className="w-full">
              Iniciar conversa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
