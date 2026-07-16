import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireApprovedUser } from "@/src/modules/auth/dal";
import { listPublishedMagazineIssues } from "@/src/modules/magazine/queries";

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
              <Card className="h-full overflow-hidden transition-colors hover:bg-muted/50">
                <div className="relative aspect-[3/4] bg-muted">
                  {issue.coverImageUrl ? (
                    <Image
                      src={issue.coverImageUrl}
                      alt={issue.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Sem capa
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-sm">{issue.title}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
