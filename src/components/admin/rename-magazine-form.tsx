"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { renameMagazineIssueAction } from "@/src/modules/magazine/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RenameMagazineForm({ id, title }: { id: string; title: string }) {
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await renameMagazineIssueAction(id, { title: value });
      if (result?.message) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="max-w-sm" />
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? "Salvando…" : "Renomear"}
        </Button>
      </div>
    </form>
  );
}
