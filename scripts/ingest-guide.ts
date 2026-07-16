import "dotenv/config";

import { prisma } from "@/src/lib/prisma";
import { ingestGuideDocument } from "@/src/modules/guide/ingest";

// Roda com `npm run guide:ingest`. Cria uma nova versão do GuideDocument a
// cada execução (histórico preservado, ver src/modules/guide/ingest.ts) —
// então não é idempotente por design: rodar duas vezes ingere o guia duas
// vezes como versões separadas. Se só precisar preencher embeddings que
// falharam por falta de AI_GATEWAY_API_KEY, use `npm run ai:reembed`.
async function main() {
  const result = await ingestGuideDocument({
    title: "Guia Oficial da Atlântica Natural",
    filePath: ".claude/knowledge/guia-produtos-atlantica-2026.pdf",
  });

  console.log(`Guia ingerido: documento ${result.guideDocumentId}, ${result.chunkCount} chunks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
