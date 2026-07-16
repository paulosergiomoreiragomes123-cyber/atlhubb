import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { BLOB_UPLOAD_RULES, type BlobUploadKind } from "@/src/lib/blob";

// Gera o token de upload direto-do-navegador (não recebe o arquivo — só
// autoriza). Só admin pode subir material de revista.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APROVADO" || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const kind = (clientPayload as BlobUploadKind) || "cover";
        const rules = BLOB_UPLOAD_RULES[kind] ?? BLOB_UPLOAD_RULES.cover;

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
