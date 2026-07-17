import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { renderMagazinePdf } from "@/src/modules/magazine/pdf-template";
import { getMyProfile, buildConsultantInfo } from "@/src/modules/profile/queries";
import type { MagazineSection } from "@/src/modules/magazine/generator";

// PDF gerado NA HORA, por consultor — nunca armazenado (ver PROJECT.md).
// Rodapé/última página usam o perfil de quem está baixando AGORA, não um
// dado fixo da edição — por isso isso é um Route Handler (streaming de
// binário) e não uma Server Action. O snapshot já vem pronto do banco (o
// casamento com o Guia acontece na geração, não aqui) — o trabalho real
// desta rota é buscar ~260 fotos remotas e gerar um QR Code por produto,
// por isso um teto maior que o padrão de 60s (Magazine V3 tem bem mais
// produtos/páginas que a v2).
export const maxDuration = 120;

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

  const profile = await getMyProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const consultant = buildConsultantInfo(profile, user.name);
  const sections = (issue.productSnapshot as { sections?: MagazineSection[] } | null)?.sections ?? [];

  try {
    const buffer = await renderMagazinePdf({ title: issue.title, sections, consultant });
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
