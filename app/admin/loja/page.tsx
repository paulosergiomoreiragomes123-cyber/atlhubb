import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/src/modules/auth/dal";
import { prisma } from "@/src/lib/prisma";
import { getLatestSyncRun, getStoreSyncStats } from "@/src/modules/store-sync/queries";
import { SyncStoreButton, RegenerateEmbeddingsButton } from "@/src/components/admin/store-sync-panel";

export const metadata: Metadata = { title: "Loja / Sincronização — AtlHub" };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function LojaSincronizacaoPage() {
  await requireAdmin();

  const [storeStats, latestRun, guideDocuments, chunkStats] = await Promise.all([
    getStoreSyncStats(),
    getLatestSyncRun(),
    prisma.guideDocument.findMany({
      orderBy: { version: "desc" },
      select: { id: true, title: true, version: true, status: true, _count: { select: { chunks: true } } },
    }),
    Promise.all([prisma.guideChunk.count(), prisma.guideChunk.count({ where: { embedding: { equals: [] } } })]).then(
      ([total, semEmbedding]) => ({ total, semEmbedding })
    ),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Loja / Sincronização</h1>
        <p className="text-muted-foreground">
          Consultor da IA com duas fontes: o Guia Oficial (PDF ingerido) e o catálogo
          sincronizado da loja pública (loja.atlanticanatural.com.br). Nenhuma sincronização
          apaga dados do Guia — são tabelas separadas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Produtos sincronizados</CardDescription>
            <CardTitle className="text-3xl">{storeStats.syncedProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Categorias no catálogo</CardDescription>
            <CardTitle className="text-3xl">{storeStats.totalCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Chunks do Guia</CardDescription>
            <CardTitle className="text-3xl">{chunkStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Chunks sem embedding</CardDescription>
            <CardTitle className="text-3xl">{chunkStats.semEmbedding}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Última sincronização da loja</CardTitle>
        </CardHeader>
        <CardContent>
          {!latestRun ? (
            <p className="text-sm text-muted-foreground">Nenhuma sincronização rodou ainda.</p>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={latestRun.status === "ERRO" ? "destructive" : "secondary"}>
                  {latestRun.status}
                </Badge>
                <span className="text-muted-foreground">
                  {dateFormatter.format(latestRun.startedAt)}
                  {latestRun.triggeredBy ? ` — disparada por ${latestRun.triggeredBy}` : ""}
                </span>
              </div>
              <span>
                {latestRun.categoriesFound} categoria(s), {latestRun.productsFound} produto(s) — {latestRun.created}{" "}
                criado(s), {latestRun.updated} atualizado(s), {latestRun.unchanged} sem mudança.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sincronizar loja</CardTitle>
          <CardDescription>
            Busca categorias, produtos, preço e imagem na loja pública (autenticado como
            consultor) e atualiza o catálogo — nunca sobrescreve preço/estoque sem mudança
            real, nunca desativa produto existente. Roda também automaticamente via cron
            (ver <code>vercel.ts</code>) e localmente via <code>npm run store:sync</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncStoreButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regerar embeddings</CardTitle>
          <CardDescription>
            Preenche embeddings pendentes de produtos e de chunks do Guia (útil depois de
            configurar <code>AI_GATEWAY_API_KEY</code> pela primeira vez, ou depois de uma
            sincronização grande). Mesma lógica de <code>npm run ai:reembed</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegenerateEmbeddingsButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guia Oficial</CardTitle>
          <CardDescription>
            A reingestão completa do PDF lê o arquivo do disco local (
            <code>.claude/knowledge/guia-produtos-atlantica-2026.pdf</code>) — só funciona
            rodando <code>npm run guide:ingest</code> localmente ou em CI, não a partir deste
            painel em produção (sem acesso ao arquivo). Use o botão acima só pra reprocessar
            embeddings de chunks já ingeridos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {guideDocuments.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum documento ingerido ainda.</p>
          )}
          {guideDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>
                {doc.title} <span className="text-muted-foreground">v{doc.version}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {doc._count.chunks} chunk(s)
                <Badge variant={doc.status === "PRONTO" ? "secondary" : doc.status === "ERRO" ? "destructive" : "outline"}>
                  {doc.status}
                </Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
