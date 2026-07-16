import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/src/modules/auth/dal";
import { listMagazineIssues } from "@/src/modules/magazine/queries";
import { MagazineForm } from "@/src/components/admin/magazine-form";

export const metadata: Metadata = { title: "Revista digital — AtlHub" };

export default async function RevistaPage() {
  await requireAdmin();
  const issues = await listMagazineIssues();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Revista digital</h1>
        <p className="text-muted-foreground">
          Edições ficam como rascunho até serem publicadas para os consultores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova edição</CardTitle>
          <CardDescription>
            Faça upload do PDF (ou cole uma URL) — publique quando estiver pronta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MagazineForm />
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Publicada em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <TableRow key={issue.id}>
              <TableCell className="font-medium">{issue.title}</TableCell>
              <TableCell>
                <Badge variant={issue.status === "PUBLICADA" ? "default" : "secondary"}>
                  {issue.status === "PUBLICADA" ? "Publicada" : "Rascunho"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {issue.publishedAt
                  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(issue.publishedAt)
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/revista/${issue.id}`}>Editar</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {issues.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhuma edição ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
