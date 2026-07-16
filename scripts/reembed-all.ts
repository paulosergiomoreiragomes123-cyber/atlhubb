import "dotenv/config";

import { prisma } from "@/src/lib/prisma";
import { reembedAllPending } from "@/src/modules/ai/reembed";

// Roda com `npm run ai:reembed` depois que AI_GATEWAY_API_KEY estiver
// configurada de verdade (deploy). Wrapper fino: a lógica real mora em
// src/modules/ai/reembed.ts, reaproveitada também pelo botão "Regerar
// embeddings" em /admin/loja (src/modules/store-sync/actions.ts).
async function main() {
  const result = await reembedAllPending();
  console.log(`Produtos: ${result.productsUpdated} reembedados, ${result.productsSkipped} já atualizados.`);
  console.log(`Chunks do Guia: ${result.chunksUpdated} reembedados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
