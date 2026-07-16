"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  generateMagazineSchema,
  MAGAZINE_FILTER_LABELS,
  MAGAZINE_FILTER_VALUES,
  type GenerateMagazineInput,
} from "@/src/modules/magazine/schemas";
import { generateMagazineIssueAction } from "@/src/modules/magazine/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Substitui o antigo MagazineForm (upload manual de PDF/capa): em vez de
// pedir arquivo, só pede título + filtro, e o conteúdo é montado sozinho a
// partir do catálogo sincronizado (ver src/modules/magazine/generator.ts).
export function GenerateMagazineForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<GenerateMagazineInput>({
    resolver: zodResolver(generateMagazineSchema),
    defaultValues: { title: defaultTitle(), filterType: "TODOS" },
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da edição</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ex.: Edição de Julho 2026" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="filterType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produtos a incluir</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MAGAZINE_FILTER_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {MAGAZINE_FILTER_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Gerando…" : "Gerar Revista"}
        </Button>
      </form>
    </Form>
  );
}
