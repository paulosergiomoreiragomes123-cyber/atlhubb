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
import { GenerateMagazineForm } from "@/src/components/admin/generate-magazine-form";
import type { MagazineSection } from "@/src/modules/magazine/generator";

export const metadata: Metadata = { title: "Revista digital — AtlHub" };

export default async function RevistaPage() {
  await requireAdmin();
  const issues = await listMagazineIssues();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Revista digital</h1>
        <p className="text-muted-foreground">
          Gerada automaticamente a partir do catálogo sincronizado — fica como
          rascunho até ser publicada para os consultores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gerar Revista</CardTitle>
          <CardDescription>
            Escolha o recorte de produtos — a capa e as páginas são montadas
            sozinhas. Você revisa o preview antes de publicar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateMagazineForm />
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Publicada em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => {
            const sections = (issue.productSnapshot as { sections?: MagazineSection[] } | null)?.sections ?? [];
            const productCount = sections.reduce((sum, section) => sum + section.products.length, 0);
            return (
            <TableRow key={issue.id}>
              <TableCell className="font-medium">{issue.title}</TableCell>
              <TableCell className="text-muted-foreground">
                {productCount}
              </TableCell>
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
            );
          })}
          {issues.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhuma edição ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
