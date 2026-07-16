import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/src/modules/auth/dal";
import { getMagazineIssue } from "@/src/modules/magazine/queries";
import { MagazineForm } from "@/src/components/admin/magazine-form";
import {
  publishMagazineIssueAction,
  unpublishMagazineIssueAction,
  deleteMagazineIssueAction,
} from "@/src/modules/magazine/actions";
import { BackLink } from "@/src/components/admin/back-link";

export const metadata: Metadata = { title: "Editar edição — AtlHub" };

export default async function EditarRevistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const issue = await getMagazineIssue(id);
  if (!issue) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href="/admin/revista" label="Voltar para revista" />
      <div>
        <h1 className="text-2xl font-semibold">{issue.title}</h1>
        <p className="text-muted-foreground">
          {issue.status === "PUBLICADA" ? "Publicada" : "Rascunho"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da edição</CardTitle>
        </CardHeader>
        <CardContent>
          <MagazineForm issue={issue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicação</CardTitle>
          <CardDescription>
            Só edições publicadas aparecem para os consultores em /consultor/revista.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {issue.status === "PUBLICADA" ? (
            <form action={unpublishMagazineIssueAction.bind(null, issue.id)}>
              <Button type="submit" variant="outline">
                Despublicar
              </Button>
            </form>
          ) : (
            <form action={publishMagazineIssueAction.bind(null, issue.id)}>
              <Button type="submit">Publicar</Button>
            </form>
          )}
          <form action={deleteMagazineIssueAction.bind(null, issue.id)}>
            <Button type="submit" variant="destructive">
              Excluir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
