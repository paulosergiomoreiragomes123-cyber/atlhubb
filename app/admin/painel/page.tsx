import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/src/modules/auth/dal";
import { getUserStatusSummary } from "@/src/modules/users/queries";
import { getCatalogSummary } from "@/src/modules/products/queries";
import { listLowStockProducts, LOW_STOCK_THRESHOLD } from "@/src/modules/stock/queries";
import { listRecentAuditLogs } from "@/src/modules/audit/queries";
import { prisma } from "@/src/lib/prisma";

export const metadata: Metadata = { title: "Painel do Administrador — AtlHub" };

export default async function PainelAdminPage() {
  const admin = await requireAdmin();
  const [summary, catalog, lowStock, recentLogs, brandCount, supplierCount, publishedIssueCount] =
    await Promise.all([
      getUserStatusSummary(),
      getCatalogSummary(),
      listLowStockProducts(),
      listRecentAuditLogs(8),
      prisma.brand.count(),
      prisma.supplier.count(),
      prisma.magazineIssue.count({ where: { status: "PUBLICADA" } }),
    ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {admin.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Visão geral do AtlHub.</p>
        </div>
        <Button asChild>
          <Link href="/admin/usuarios">Gerenciar usuários</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Aguardando aprovação</CardDescription>
            <CardTitle className="text-3xl">{summary.aguardando}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Aprovados</CardDescription>
            <CardTitle className="text-3xl">{summary.aprovado}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Reprovados</CardDescription>
            <CardTitle className="text-3xl">{summary.reprovado}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Suspensos</CardDescription>
            <CardTitle className="text-3xl">{summary.suspenso}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Link href="/admin/produtos">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardDescription>Produtos ativos</CardDescription>
              <CardTitle className="text-3xl">
                {catalog.active}
                <span className="text-base font-normal text-muted-foreground">/{catalog.total}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/produtos?estoque=baixo">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardDescription>Estoque baixo (&lt; {LOW_STOCK_THRESHOLD})</CardDescription>
              <CardTitle className="text-3xl">{lowStock.length}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/marcas">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardDescription>Marcas</CardDescription>
              <CardTitle className="text-3xl">{brandCount}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/fornecedores">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardDescription>Fornecedores</CardDescription>
              <CardTitle className="text-3xl">{supplierCount}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/revista">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardDescription>Edições publicadas</CardDescription>
              <CardTitle className="text-3xl">{publishedIssueCount}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos com estoque baixo</CardTitle>
            <CardDescription>Menos de {LOW_STOCK_THRESHOLD} unidades.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {lowStock.slice(0, 8).map((product) => (
              <Link
                key={product.id}
                href={`/admin/produtos/${product.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span>{product.name}</span>
                <Badge variant={product.stock <= 0 ? "destructive" : "secondary"}>
                  {product.stock} un.
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <CardDescription>Últimas ações no painel administrativo.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/auditoria">Ver tudo</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium">{log.actorName}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">{log.action}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                  log.createdAt
                )}
              </span>
            </div>
          ))}
          {recentLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
