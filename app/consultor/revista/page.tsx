import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { listPublishedMagazineIssues } from "@/src/modules/magazine/queries";
import { ShareButton } from "@/src/components/consultor/share-button";
import { MagazinePdfViewer } from "@/src/components/magazine/magazine-pdf-viewer";

export const metadata: Metadata = { title: "Revista digital — AtlHub" };

export default async function RevistaConsultorPage() {
  await requireApprovedUser();

  const issues = await listPublishedMagazineIssues();
  const issue = issues[0] ?? null;

  if (!issue) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Revista digital</h1>
          <p className="text-muted-foreground">Nenhuma edição publicada ainda.</p>
        </div>
      </div>
    );
  }

  // DEBUG TEMPORÁRIO (remover depois de confirmado em produção) — prova,
  // via log de servidor E marcador visual, que É este arquivo que está
  // respondendo /consultor/revista.
  console.log("[MAGAZINE-V4-DEBUG] app/consultor/revista/page.tsx renderizando, issue.id=", issue.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-10">
      <div className="rounded-md border-2 border-dashed border-red-500 bg-red-50 p-3 text-sm font-semibold text-red-700">
        DEBUG MAGAZINE V4 — app/consultor/revista/page.tsx — issue {issue.id} — {new Date().toISOString()}
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Revista digital</h1>
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
