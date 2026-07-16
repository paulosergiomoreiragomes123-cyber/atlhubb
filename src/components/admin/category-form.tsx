"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { categorySchema, type CategoryInput } from "@/src/modules/categories/schemas";
import { createCategoryAction, updateCategoryAction } from "@/src/modules/categories/actions";
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
import { slugify } from "@/src/lib/slugify";

const NO_PARENT = "none";

export function CategoryForm({
  category,
  categoryOptions,
  onSaved,
}: {
  category?: { id: string; name: string; slug: string; parentId: string | null };
  categoryOptions: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      parentId: category?.parentId ?? "",
    },
  });

  function onSubmit(values: CategoryInput) {
    setServerError(null);
    const payload = {
      ...values,
      parentId: values.parentId === NO_PARENT ? "" : values.parentId,
    };

    startTransition(async () => {
      const result = category
        ? await updateCategoryAction(category.id, payload)
        : await createCategoryAction(payload);

      if (result?.message) {
        setServerError(result.message);
        return;
      }

      form.reset({ name: "", slug: "", parentId: "" });
      router.refresh();
      onSaved?.();
    });
  }

  const otherCategories = categoryOptions.filter((c) => c.id !== category?.id);

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
                      if (!category) {
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
                  <Input {...field} placeholder="ex.: linha-facial" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria-pai</FormLabel>
              <Select
                value={field.value || NO_PARENT}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Nenhuma (categoria de topo)</SelectItem>
                  {otherCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : category ? "Salvar alterações" : "Criar categoria"}
        </Button>
      </form>
    </Form>
  );
}
