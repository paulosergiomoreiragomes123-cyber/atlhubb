import { NextResponse } from "next/server";

import { getQrCodeBySlug } from "@/src/modules/qrcode/queries";
import { assembleOfficialMagazinePdf } from "@/src/modules/magazine/official-pdf-assembler";
import { getMyProfile, buildConsultantInfo } from "@/src/modules/profile/queries";

// Contraparte pública (sem login) de /api/revista/[id]/pdf — é o que
// app/c/[slug]/page.tsx embute num <iframe> quando o QR Code é do tipo
// REVISTA. `slug` já é o segredo de autorização (mesmo modelo de toda
// /c/[slug]/page.tsx — quem tem o link/QR pode ver, sem exigir conta no
// AtlHub, porque quem escaneia é o CLIENTE do consultor). A revista gerada
// usa sempre os dados de quem CRIOU o QR Code (mesma regra da página).
export const maxDuration = 120;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const qrCode = await getQrCodeBySlug(slug);
  if (!qrCode || qrCode.targetType !== "REVISTA" || qrCode.magazineIssue?.status !== "PUBLICADA") {
    return NextResponse.json({ error: "Revista não encontrada." }, { status: 404 });
  }

  const creatorProfile = qrCode.createdById ? await getMyProfile(qrCode.createdById) : null;
  const consultant = buildConsultantInfo(creatorProfile, "Atlântica Natural");

  const forceDownload = new URL(request.url).searchParams.get("download") === "1";

  try {
    const buffer = await assembleOfficialMagazinePdf({ consultant });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="revista.pdf"`,
      },
    });
  } catch (error) {
    console.error("[c/slug/pdf] Falha ao gerar PDF sob demanda:", error);
    return NextResponse.json({ error: "Falha ao gerar o PDF." }, { status: 500 });
  }
}
