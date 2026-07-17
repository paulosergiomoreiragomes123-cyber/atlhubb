import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { getPublishedMagazineIssue } from "@/src/modules/magazine/queries";
import { ShareButton } from "@/src/components/consultor/share-button";
import { MagazinePdfViewer } from "@/src/components/magazine/magazine-pdf-viewer";

export const metadata: Metadata = { title: "Revista digital — AtlHub" };

export default async function LeitorRevistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApprovedUser();
  const { id } = await params;

  const issue = await getPublishedMagazineIssue(id);
  if (!issue) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-10">
      <div className="flex items-center justify-between">
        <Link
          href="/consultor/revista"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/revista/${issue.id}/pdf?download=1`}
            prefetch={false}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Download className="size-4" />
            Baixar PDF
          </Link>
          <ShareButton targetType="REVISTA" magazineIssueId={issue.id} />
        </div>
      </div>

      <MagazinePdfViewer src={`/api/revista/${issue.id}/pdf`} />
    </div>
  );
}
