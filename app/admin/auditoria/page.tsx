import type { Metadata } from "next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/src/modules/auth/dal";
import { listAuditLogs, listAuditEntityTypes } from "@/src/modules/audit/queries";
import { buildQueryHref } from "@/src/lib/query-href";
import { FilterLink } from "@/src/components/filter-link";

export const metadata: Metadata = { title: "Auditoria — AtlHub" };

type SearchParams = { q?: string; tipo?: string };

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [logs, entityTypes] = await Promise.all([
    listAuditLogs({ q: params.q, entityType: params.tipo }),
    listAuditEntityTypes(),
  ]);

  const buildHref = (overrides: Partial<SearchParams>) =>
    buildQueryHref("/admin/auditoria", params, overrides);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted-foreground">
          Quem fez o quê no AtlHub — as últimas 200 ações. Registrado automaticamente
          a cada mutação no painel administrativo.
        </p>
      </div>

      <form className="flex max-w-sm gap-2">
        {params.tipo && <input type="hidden" name="tipo" value={params.tipo} />}
        <Input name="q" defaultValue={params.q} placeholder="Buscar por autor ou ação…" />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink label="Todas entidades" href={buildHref({ tipo: undefined })} active={!params.tipo} />
        {entityTypes.map((type) => (
          <FilterLink
            key={type}
            label={type}
            href={buildHref({ tipo: type })}
            active={params.tipo === type}
          />
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Quem</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(log.createdAt)}
              </TableCell>
              <TableCell>
                <div className="text-sm">{log.actorName}</div>
                <div className="text-xs text-muted-foreground">{log.actorEmail}</div>
              </TableCell>
              <TableCell className="font-mono text-xs">{log.action}</TableCell>
              <TableCell className="text-muted-foreground">
                {log.entityType}
                {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
