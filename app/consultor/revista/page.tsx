import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { listPublishedMagazineIssues } from "@/src/modules/magazine/queries";
import { getMyProfile } from "@/src/modules/profile/queries";
import { ShareButton } from "@/src/components/consultor/share-button";
import { MagazineView, type ConsultantInfo } from "@/src/components/magazine/magazine-view";

export const metadata: Metadata = { title: "Revista digital — AtlHub" };

export default async function RevistaConsultorPage() {
  const user = await requireApprovedUser();

  const [issues, profile] = await Promise.all([listPublishedMagazineIssues(), getMyProfile(user.id)]);
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

  const consultant: ConsultantInfo = {
    name: user.name,
    phone: profile?.phone ?? null,
    whatsapp: profile?.whatsapp ?? null,
    city: profile?.city ?? null,
    instagram: profile?.instagram ?? null,
    photoUrl: profile?.photoUrl ?? null,
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Revista digital</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/revista/${issue.id}/pdf`}
            prefetch={false}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Download className="size-4" />
            Baixar PDF
          </Link>
          <ShareButton targetType="REVISTA" magazineIssueId={issue.id} />
        </div>
      </div>

      <MagazineView issue={issue} consultant={consultant} />
    </div>
  );
}
