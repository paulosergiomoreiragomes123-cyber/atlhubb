"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  stockAdjustmentSchema,
  stockCorrectionSchema,
  type StockAdjustmentInput,
  type StockCorrectionInput,
} from "@/src/modules/products/schemas";
import { adjustStockAction, setStockAction } from "@/src/modules/stock/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FormMessage,
} from "@/components/ui/form";

export function StockMovementForm({ productId }: { productId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: { quantity: "", reason: "ENTRADA", note: "" },
  });

  function onSubmit(values: StockAdjustmentInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await adjustStockAction(productId, values);
      if (result?.message) {
        setServerError(result.message);
        return;
      }
      form.reset({ quantity: "", reason: values.reason, note: "" });
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <Label className="sr-only">Tipo</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SAIDA">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem className="flex-1">
                <Label className="sr-only">Quantidade</Label>
                <FormControl>
                  <Input {...field} placeholder="Quantidade" inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : "Registrar"}
          </Button>
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="Observação (opcional)" />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export function StockCorrectionForm({ productId, currentStock }: { productId: string; currentStock: number }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<StockCorrectionInput>({
    resolver: zodResolver(stockCorrectionSchema),
    defaultValues: { targetQuantity: String(currentStock), note: "" },
  });

  function onSubmit(values: StockCorrectionInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await setStockAction(productId, values);
      if (result?.message) {
        setServerError(result.message);
        return;
      }
      form.reset({ targetQuantity: values.targetQuantity, note: "" });
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="targetQuantity"
            render={({ field }) => (
              <FormItem className="flex-1">
                <Label className="sr-only">Quantidade correta</Label>
                <FormControl>
                  <Input {...field} placeholder="Quantidade correta" inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? "Corrigindo…" : "Corrigir estoque"}
          </Button>
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="Motivo da correção (opcional)" />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
