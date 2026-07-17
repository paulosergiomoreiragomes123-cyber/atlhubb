import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
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
import type { MagazineSection } from "@/src/modules/magazine/generator";
import {
  publishMagazineIssueAction,
  unpublishMagazineIssueAction,
  deleteMagazineIssueAction,
} from "@/src/modules/magazine/actions";
import { RenameMagazineForm } from "@/src/components/admin/rename-magazine-form";
import { MagazineView } from "@/src/components/magazine/magazine-view";
import { getMyProfile, buildConsultantInfo } from "@/src/modules/profile/queries";
import { BackLink } from "@/src/components/admin/back-link";

export const metadata: Metadata = { title: "Editar edição — AtlHub" };

export default async function EditarRevistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [issue, profile] = await Promise.all([getMagazineIssue(id), getMyProfile(admin.id)]);
  if (!issue) notFound();

  // Preview usa os dados reais do próprio admin logado (se ele tiver
  // preenchido /consultor/perfil) — campos vazios simplesmente somem do
  // preview, nunca inventados.
  const previewConsultant = buildConsultantInfo(profile, admin.name);
  const sections = (issue.productSnapshot as { sections?: MagazineSection[] } | null)?.sections ?? [];
  const productCount = sections.reduce((sum, section) => sum + section.products.length, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <BackLink href="/admin/revista" label="Voltar para revista" />
      <div>
        <h1 className="text-2xl font-semibold">{issue.title}</h1>
        <p className="text-muted-foreground">
          {issue.status === "PUBLICADA" ? "Publicada" : "Rascunho"} · {sections.length}{" "}
          {sections.length === 1 ? "seção" : "seções"} · {productCount}{" "}
          {productCount === 1 ? "produto" : "produtos"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Título</CardTitle>
        </CardHeader>
        <CardContent>
          <RenameMagazineForm id={issue.id} title={issue.title} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicação</CardTitle>
          <CardDescription>
            Só edições publicadas aparecem para os consultores em /consultor/revista.
            Cada consultor baixa o PDF com o próprio contato no rodapé — não
            existe um PDF único pra todo mundo (ver &ldquo;Baixar PDF de exemplo&rdquo;
            abaixo, que usa os seus dados de admin só pra conferir o layout).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
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
          <Button asChild variant="outline">
            <Link href={`/api/revista/${issue.id}/pdf`} prefetch={false}>
              <Download className="size-4" />
              Baixar PDF de exemplo
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            Estrutura exata do que o consultor vê — o rodapé/última página
            aqui usam seus dados de admin, cada consultor vê os próprios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MagazineView issue={issue} consultant={previewConsultant} />
        </CardContent>
      </Card>
    </div>
  );
}
