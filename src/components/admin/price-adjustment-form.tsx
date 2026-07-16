"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  priceAdjustmentSchema,
  type PriceAdjustmentInput,
} from "@/src/modules/products/schemas";
import { adjustPriceAction } from "@/src/modules/products/actions";
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

export function PriceAdjustmentForm({ productId }: { productId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<PriceAdjustmentInput>({
    resolver: zodResolver(priceAdjustmentSchema),
    defaultValues: { priceInput: "" },
  });

  function onSubmit(values: PriceAdjustmentInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await adjustPriceAction(productId, values);
      if (result?.message) {
        setServerError(result.message);
        return;
      }
      form.reset({ priceInput: "" });
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
        {serverError && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        {!serverError && (
          <>
            <FormField
              control={form.control}
              name="priceInput"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Novo preço</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Novo preço, ex.: 24,90" inputMode="decimal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Ajustar preço"}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
