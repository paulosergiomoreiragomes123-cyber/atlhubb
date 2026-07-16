import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { BLOB_UPLOAD_RULES, type BlobUploadKind } from "@/src/lib/blob";

// Gera o token de upload direto-do-navegador (não recebe o arquivo — só
// autoriza). Fase 7 v2: o único kind hoje é a foto de perfil do próprio
// consultor (ver src/lib/blob.ts) — qualquer usuário APROVADO pode subir a
// própria foto, não é mais admin-only (era, quando o único uso era upload
// de PDF/capa de revista pelo admin).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APROVADO") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const kind = (clientPayload as BlobUploadKind) || "consultantPhoto";
        const rules = BLOB_UPLOAD_RULES[kind] ?? BLOB_UPLOAD_RULES.consultantPhoto;

        return {
          allowedContentTypes: [...rules.allowedContentTypes],
          maximumSizeInBytes: rules.maximumSizeInBytes,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[blob] Falha ao gerar token de upload:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
