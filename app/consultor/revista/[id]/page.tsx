import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { getPublishedMagazineIssue } from "@/src/modules/magazine/queries";
import { ShareButton } from "@/src/components/consultor/share-button";

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
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link
          href="/consultor/revista"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {issue.title}
        </Link>
        <ShareButton targetType="REVISTA" magazineIssueId={issue.id} />
      </div>

      <iframe
        src={issue.pdfUrl}
        title={issue.title}
        className="w-full flex-1 rounded-lg border"
      />
    </div>
  );
}
