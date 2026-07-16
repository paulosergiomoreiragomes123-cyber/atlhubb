"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { brandSchema, type BrandInput } from "@/src/modules/brands/schemas";
import { createBrandAction, updateBrandAction } from "@/src/modules/brands/actions";
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
import { slugify } from "@/src/lib/slugify";

export function BrandForm({
  brand,
  onSaved,
}: {
  brand?: { id: string; name: string; slug: string; logoUrl: string | null };
  onSaved?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<BrandInput>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand?.name ?? "",
      slug: brand?.slug ?? "",
      logoUrl: brand?.logoUrl ?? "",
    },
  });

  function onSubmit(values: BrandInput) {
    setServerError(null);
    startTransition(async () => {
      const result = brand
        ? await updateBrandAction(brand.id, values)
        : await createBrandAction(values);

      if (result?.message) {
        setServerError(result.message);
        return;
      }

      form.reset({ name: "", slug: "", logoUrl: "" });
      router.refresh();
      onSaved?.();
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (!brand) {
                        form.setValue("slug", slugify(e.target.value));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ex.: atlantica-natural" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do logo (opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://…" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : brand ? "Salvar alterações" : "Criar marca"}
        </Button>
      </form>
    </Form>
  );
}
