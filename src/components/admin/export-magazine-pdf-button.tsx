"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { exportMagazinePdfAction } from "@/src/modules/magazine/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ExportMagazinePdfButton({ id, pdfUrl }: { id: string; pdfUrl: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await exportMagazinePdfAction(id);
      if (result?.message) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
          {isPending ? "Gerando PDF…" : pdfUrl ? "Gerar PDF novamente" : "Exportar PDF"}
        </Button>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Baixar PDF atual
          </a>
        )}
      </div>
    </div>
  );
}
