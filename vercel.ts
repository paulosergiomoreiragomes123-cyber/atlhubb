import type { VercelConfig } from "@vercel/config/v1";

// Fase 6A — sincronização automática do catálogo com a loja pública
// (loja.atlanticanatural.com.br). Uma vez por dia (03h UTC = meia-noite em
// Brasília), chama app/api/cron/sync-loja, protegida por CRON_SECRET (a
// Vercel manda o Authorization: Bearer automaticamente quando essa env var
// está configurada no projeto). Plano Hobby da Vercel só permite cron diário
// — se o projeto for pra Pro no futuro, dá pra aumentar a frequência (ex.:
// "0 */6 * * *" pra a cada 6h) sem mudar mais nada.
export const config: VercelConfig = {
  crons: [{ path: "/api/cron/sync-loja", schedule: "0 3 * * *" }],
};
