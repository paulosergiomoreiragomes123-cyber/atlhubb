"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/src/modules/auth/dal";
import { recordAuditLog } from "@/src/modules/audit/log";
import { runStoreSync } from "@/src/modules/store-sync/sync";
import { reembedAllPending, type ReembedSummary } from "@/src/modules/ai/reembed";
import type { StoreSyncResult } from "@/src/modules/store-sync/types";

// "Sincronizar loja agora" (Etapa 6). Reaproveita a mesma runStoreSync usada
// pelo cron (app/api/cron/sync-loja) e pelo script `npm run store:sync` — um
// único caminho de sincronização, três formas de disparar.
export async function syncStoreAction(_prevState: StoreSyncResult | undefined): Promise<StoreSyncResult> {
  const admin = await requireAdmin();

  const result = await runStoreSync(`admin:${admin.id}`);

  await recordAuditLog({
    actor: admin,
    action: "store.sync",
    entityType: "Product",
    metadata: {
      status: result.status,
      categoriesFound: result.categoriesFound,
      productsFound: result.productsFound,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
      errorCount: result.errors.length,
    },
  });

  revalidatePath("/admin/loja");
  revalidatePath("/admin/produtos");
  revalidatePath("/consultor/catalogo");

  return result;
}

// "Regerar embeddings" (Etapa 6) — mesma lógica de `npm run ai:reembed`,
// chamável pelo admin sem precisar de acesso a terminal/deploy.
export async function regenerateEmbeddingsAction(
  _prevState: ReembedSummary | undefined
): Promise<ReembedSummary> {
  const admin = await requireAdmin();

  const result = await reembedAllPending();

  await recordAuditLog({
    actor: admin,
    action: "ai.reembed_all",
    entityType: "Product",
    metadata: { ...result },
  });

  revalidatePath("/admin/loja");

  return result;
}
