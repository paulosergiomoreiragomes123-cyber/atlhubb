import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { renderMagazinePdf } from "@/src/modules/magazine/pdf-template";
import type { ConsultantInfo } from "@/src/components/magazine/magazine-view";
import type { ProductSnapshotItem } from "@/src/modules/magazine/generator";

// PDF gerado NA HORA, por consultor — nunca armazenado (ver PROJECT.md,
// Fase 7 v2). Rodapé/última página usam o perfil de quem está baixando
// AGORA, não um dado fixo da edição — por isso isso é um Route Handler
// (streaming de binário) e não uma Server Action.
export const maxDuration = 60;

// Não usa requireApprovedUser() (que faz redirect(), pensado pra páginas) —
// mesmo padrão de app/api/ia/route.ts: rota consumida por link direto/fetch,
// devolve 401/404 puro.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APROVADO") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const issue = await prisma.magazineIssue.findUnique({ where: { id } });
  if (!issue) {
    return NextResponse.json({ error: "Edição não encontrada." }, { status: 404 });
  }
  // Consultor só baixa edição publicada (nunca edita/vê rascunho, ver
  // PROJECT.md) — admin pode baixar um rascunho pra conferir antes de publicar.
  if (issue.status !== "PUBLICADA" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Edição não encontrada." }, { status: 404 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, phone: true, whatsapp: true, city: true, instagram: true, photoUrl: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const consultant: ConsultantInfo = profile;
  const snapshot = (issue.productSnapshot ?? []) as unknown as ProductSnapshotItem[];

  try {
    const buffer = await renderMagazinePdf({ title: issue.title, products: snapshot, consultant });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="revista-${issue.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[revista] Falha ao gerar PDF sob demanda:", error);
    return NextResponse.json({ error: "Falha ao gerar o PDF." }, { status: 500 });
  }
}
