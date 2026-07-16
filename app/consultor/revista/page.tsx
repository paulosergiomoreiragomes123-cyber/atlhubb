import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireApprovedUser } from "@/src/modules/auth/dal";
import { listPublishedMagazineIssues } from "@/src/modules/magazine/queries";
import { MagazineCoverPreview } from "@/src/components/magazine/magazine-cover-preview";

export const metadata: Metadata = { title: "Revista digital — AtlHub" };

export default async function RevistaConsultorPage() {
  await requireApprovedUser();
  const issues = await listPublishedMagazineIssues();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Revista digital</h1>
        <p className="text-muted-foreground">Edições publicadas da Atlântica Natural.</p>
      </div>

      {issues.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma edição publicada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {issues.map((issue) => (
            <Link key={issue.id} href={`/consultor/revista/${issue.id}`}>
              <Card className="h-full overflow-hidden py-0 transition-colors hover:opacity-90">
                <div className="relative aspect-[3/4]">
                  <div className="absolute inset-0">
                    <MagazineCoverPreview title={issue.title} date={issue.publishedAt ?? issue.createdAt} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
