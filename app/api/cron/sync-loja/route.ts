import { NextResponse } from "next/server";

import { runStoreSync } from "@/src/modules/store-sync/sync";

// Disparada pelo Vercel Cron (declarado em vercel.ts, seção crons) a cada 6h.
// A Vercel manda `Authorization: Bearer ${CRON_SECRET}` automaticamente em
// requests de cron quando essa env var está configurada — checar isso aqui
// impede qualquer um que descubra a URL de disparar sincronizações à vontade.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const result = await runStoreSync("cron");
  return NextResponse.json(result, { status: result.status === "ERRO" ? 500 : 200 });
}
