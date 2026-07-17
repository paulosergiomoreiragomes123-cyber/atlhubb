"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { generateMagazineSchema, type GenerateMagazineInput } from "@/src/modules/magazine/schemas";
import { generateMagazineIssueAction } from "@/src/modules/magazine/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function defaultTitle(): string {
  const now = new Date();
  return `Edição de ${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;
}

// Magazine V3: um único botão "Gerar Magazine" — sem filtro, sem
// ordenação. O sistema busca sozinho todos os produtos ativos, relaciona
// com o Guia Oficial e os perfis olfativos de perfume, e monta as seções
// por categoria (ver src/modules/magazine/generator.ts).
export function GenerateMagazineForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<GenerateMagazineInput>({
    resolver: zodResolver(generateMagazineSchema),
    defaultValues: { title: defaultTitle() },
  });

  function onSubmit(values: GenerateMagazineInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await generateMagazineIssueAction(values);
      if (result?.message) {
        setServerError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {serverError && (
          <Alert variant="destructive" className="sm:w-full">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Título da edição</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ex.: Edição de Julho 2026" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Gerando…" : "Gerar Magazine"}
        </Button>
      </form>
    </Form>
  );
}
