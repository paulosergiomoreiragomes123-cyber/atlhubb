import "dotenv/config";

import { prisma } from "@/src/lib/prisma";
import { runStoreSync } from "@/src/modules/store-sync/sync";

// Roda com `npm run store:sync`. Útil pra rodar localmente (fora do cron) ou
// pra validar a sincronização contra o Supabase real antes de configurar o
// cron em produção. Mesma runStoreSync usada pelo cron e pelo botão
// "Sincronizar loja agora" em /admin/loja.
async function main() {
  const result = await runStoreSync("script:local");

  console.log(`Status: ${result.status}`);
  console.log(`Categorias encontradas: ${result.categoriesFound}`);
  console.log(`Produtos encontrados: ${result.productsFound}`);
  console.log(`Criados: ${result.created} | Atualizados: ${result.updated} | Sem mudança: ${result.unchanged}`);

  if (result.errors.length > 0) {
    console.log(`\n${result.errors.length} erro(s) durante a sincronização:`);
    for (const error of result.errors) {
      console.log(`  - [${error.context}] ${error.message}`);
    }
  }

  if (result.status === "ERRO") process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
