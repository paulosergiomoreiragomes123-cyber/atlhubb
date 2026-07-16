"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { Loader2 } from "lucide-react";

import {
  magazineIssueSchema,
  type MagazineIssueInput,
} from "@/src/modules/magazine/schemas";
import {
  createMagazineIssueAction,
  updateMagazineIssueAction,
} from "@/src/modules/magazine/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function UploadOrUrlField({
  label,
  value,
  onChange,
  accept,
  kind,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept: string;
  kind: "pdf" | "cover";
  hint: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: kind,
      });
      onChange(result.url);
    } catch (error) {
      setUploadError(
        `Upload falhou (${(error as Error).message}). Use o campo de URL manual abaixo, ou confirme que BLOB_READ_WRITE_TOKEN está configurada.`
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="max-w-xs"
        />
        {isUploading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
      />
    </div>
  );
}

export function MagazineForm({
  issue,
}: {
  issue?: { id: string; title: string; pdfUrl: string; coverImageUrl: string | null };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<MagazineIssueInput>({
    resolver: zodResolver(magazineIssueSchema),
    defaultValues: {
      title: issue?.title ?? "",
      pdfUrl: issue?.pdfUrl ?? "",
      coverImageUrl: issue?.coverImageUrl ?? "",
    },
  });

  function onSubmit(values: MagazineIssueInput) {
    setServerError(null);
    startTransition(async () => {
      const result = issue
        ? await updateMagazineIssueAction(issue.id, values)
        : await createMagazineIssueAction(values);

      if (result?.message) {
        setServerError(result.message);
        return;
      }

      if (issue) router.refresh();
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
          name="pdfUrl"
          render={({ field }) => (
            <FormItem>
              <UploadOrUrlField
                label="PDF da revista"
                value={field.value}
                onChange={field.onChange}
                accept="application/pdf"
                kind="pdf"
                hint="Ou cole a URL de um PDF já hospedado"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="coverImageUrl"
          render={({ field }) => (
            <FormItem>
              <UploadOrUrlField
                label="Capa (opcional)"
                value={field.value ?? ""}
                onChange={field.onChange}
                accept="image/*"
                kind="cover"
                hint="Ou cole a URL de uma imagem já hospedada"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : issue ? "Salvar alterações" : "Criar edição"}
        </Button>
      </form>
    </Form>
  );
}
