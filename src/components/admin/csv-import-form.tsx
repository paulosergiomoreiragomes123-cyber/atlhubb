"use client";

import { useActionState } from "react";

import { importProductsCsvAction, type ImportSummary } from "@/src/modules/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialState: ImportSummary = {
  created: 0,
  updated: 0,
  priceChanged: 0,
  stockChanged: 0,
  errors: [],
};

export function CsvImportForm() {
  const [state, formAction, pending] = useActionState(importProductsCsvAction, initialState);
  const hasResult = state.created > 0 || state.updated > 0 || state.errors.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Arquivo CSV</Label>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Importando…" : "Importar"}
      </Button>

      {hasResult && (
        <div className="space-y-3">
          <Alert>
            <AlertTitle>Resumo</AlertTitle>
            <AlertDescription>
              {state.created} produto(s) criado(s), {state.updated} atualizado(s),{" "}
              {state.priceChanged} com preço alterado, {state.stockChanged} com estoque alterado.
            </AlertDescription>
          </Alert>

          {state.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>{state.errors.length} linha(s) com problema</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {state.errors.map((error, index) => (
                    <li key={index}>
                      Linha {error.line}: {error.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </form>
  );
}
