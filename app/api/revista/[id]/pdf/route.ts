import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { assembleOfficialMagazinePdf } from "@/src/modules/magazine/official-pdf-assembler";
import { getMyProfile, buildConsultantInfo } from "@/src/modules/profile/queries";

// PDF gerado NA HORA, por consultor — nunca armazenado (ver PROJECT.md,
// Magazine V4). Reaproveita byte a byte as páginas da revista oficial
// impressa (capa/colagens/contracapa intactas), só sobrepõe preço atual +
// insere páginas de detalhe/tabelas olfativas — por isso é um Route
// Handler (streaming de binário) e não uma Server Action. Rodapé/capa/
// contracapa usam o perfil de quem está baixando AGORA, não um dado fixo.
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

  // Sem ?download=1: `inline` — é o que /consultor/revista embute num
  // <iframe> (ver MagazinePdfViewer). Com ?download=1: `attachment` — é o
  // link explícito "Baixar PDF", que deve forçar "Salvar como" em vez de
  // abrir dentro do iframe do próprio navegador.
  const forceDownload = new URL(request.url).searchParams.get("download") === "1";

  // DEBUG TEMPORÁRIO (remover depois de confirmado em produção).
  console.log("[MAGAZINE-V4-DEBUG] /api/revista/[id]/pdf iniciando geração, issue=", id, "user=", user.id);
  const startedAt = Date.now();

  try {
    const buffer = await assembleOfficialMagazinePdf({ consultant });
    console.log(
      "[MAGAZINE-V4-DEBUG] /api/revista/[id]/pdf gerado com sucesso em",
      Date.now() - startedAt,
      "ms, bytes=",
      buffer.length
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="revista-${issue.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error(
      "[MAGAZINE-V4-DEBUG] /api/revista/[id]/pdf falhou após",
      Date.now() - startedAt,
      "ms:",
      error
    );
    return NextResponse.json({ error: "Falha ao gerar o PDF." }, { status: 500 });
  }
}
