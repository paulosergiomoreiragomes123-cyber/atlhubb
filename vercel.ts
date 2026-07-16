import type { VercelConfig } from "@vercel/config/v1";

// Fase 6A — sincronização automática do catálogo com a loja pública
// (loja.atlanticanatural.com.br). A cada 6h, chama app/api/cron/sync-loja,
// protegida por CRON_SECRET (a Vercel manda o Authorization: Bearer
// automaticamente quando essa env var está configurada no projeto).
export const config: VercelConfig = {
  crons: [{ path: "/api/cron/sync-loja", schedule: "0 */6 * * *" }],
};
