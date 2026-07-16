"use client";

import { useActionState } from "react";

import { syncStoreAction, regenerateEmbeddingsAction } from "@/src/modules/store-sync/actions";
import type { StoreSyncResult } from "@/src/modules/store-sync/types";
import type { ReembedSummary } from "@/src/modules/ai/reembed";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialSyncState: StoreSyncResult = {
  status: "CONCLUIDO",
  categoriesFound: 0,
  productsFound: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  errors: [],
};

const initialReembedState: ReembedSummary = { productsUpdated: 0, productsSkipped: 0, chunksUpdated: 0 };

export function SyncStoreButton() {
  const [state, formAction, pending] = useActionState(syncStoreAction, undefined);
  const hasResult = state !== undefined;
  const result = state ?? initialSyncState;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Sincronizando…" : "Sincronizar loja agora"}
      </Button>

      {hasResult && (
        <div className="flex flex-col gap-2">
          <Alert variant={result.status === "ERRO" ? "destructive" : "default"}>
            <AlertTitle>{result.status === "ERRO" ? "Falha na sincronização" : "Sincronização concluída"}</AlertTitle>
            <AlertDescription>
              {result.categoriesFound} categoria(s), {result.productsFound} produto(s) encontrados —{" "}
              {result.created} criado(s), {result.updated} atualizado(s), {result.unchanged} sem mudança.
            </AlertDescription>
          </Alert>

          {result.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>{result.errors.length} problema(s) durante a sincronização</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>
                      [{error.context}] {error.message}
                    </li>
                  ))}
                </ul>
                {result.errors.length > 10 && <p>… e mais {result.errors.length - 10}.</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </form>
  );
}

export function RegenerateEmbeddingsButton() {
  const [state, formAction, pending] = useActionState(regenerateEmbeddingsAction, undefined);
  const hasResult = state !== undefined;
  const result = state ?? initialReembedState;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Regerando…" : "Regerar embeddings pendentes"}
      </Button>

      {hasResult && (
        <Alert>
          <AlertTitle>Embeddings atualizados</AlertTitle>
          <AlertDescription>
            {result.productsUpdated} produto(s) reembedado(s) ({result.productsSkipped} já atualizados), {result.chunksUpdated} chunk(s) do Guia reembedado(s).
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
