"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import {
  productDetailsSchema,
  type ProductDetailsInput,
} from "@/src/modules/products/schemas";
import { updateProductAction } from "@/src/modules/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

const NONE = "none";

export function ProductDetailsForm({
  productId,
  product,
  categoryOptions,
  brandOptions,
  supplierOptions,
}: {
  productId: string;
  product: {
    sku: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    brandId: string | null;
    supplierId: string | null;
    active: boolean;
    images: { url: string }[];
    attributes: unknown;
  };
  categoryOptions: { id: string; name: string }[];
  brandOptions: { id: string; name: string }[];
  supplierOptions: { id: string; name: string }[];
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProductDetailsInput>({
    resolver: zodResolver(productDetailsSchema),
    defaultValues: {
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      categoryId: product.categoryId ?? "",
      brandId: product.brandId ?? "",
      supplierId: product.supplierId ?? "",
      active: product.active,
      imageUrls: product.images.map((i) => i.url),
      attributesInput: product.attributes ? JSON.stringify(product.attributes) : "",
    },
  });

  const imageFields = useFieldArray({ control: form.control, name: "imageUrls" as never });

  function onSubmit(values: ProductDetailsInput) {
    setServerError(null);
    setSaved(false);
    const payload = {
      ...values,
      categoryId: values.categoryId === NONE ? "" : values.categoryId,
      brandId: values.brandId === NONE ? "" : values.brandId,
      supplierId: values.supplierId === NONE ? "" : values.supplierId,
    };

    startTransition(async () => {
      const result = await updateProductAction(productId, payload);
      if (result?.message) {
        setServerError(result.message);
        return;
      }
      setSaved(true);
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
        {saved && !serverError && (
          <Alert>
            <AlertDescription>Alterações salvas.</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attributesInput"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Atributos (JSON opcional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  {...field}
                  placeholder='{"notas": "cítrico, amadeirado", "familia_olfativa": "amadeirada", "intensidade": "forte"}'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select value={field.value || NONE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem categoria</SelectItem>
                    {categoryOptions.map((c) => (
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

          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select value={field.value || NONE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem marca" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem marca</SelectItem>
                    {brandOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                <Select value={field.value || NONE} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem fornecedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem fornecedor</SelectItem>
                    {supplierOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <FormLabel>Imagens (URL)</FormLabel>
          <div className="flex flex-col gap-2">
            {imageFields.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...form.register(`imageUrls.${index}` as const)}
                  placeholder="https://…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => imageFields.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => imageFields.append("")}
          >
            <Plus className="size-4" />
            Adicionar imagem
          </Button>
          {form.formState.errors.imageUrls && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.imageUrls.message as string}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel className="cursor-pointer">
                Ativo (visível no catálogo do consultor)
              </FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </Form>
  );
}
