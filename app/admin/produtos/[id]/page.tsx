import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/src/modules/auth/dal";
import { getProduct } from "@/src/modules/products/queries";
import { listCategoriesForSelect } from "@/src/modules/categories/queries";
import { listBrandsForSelect } from "@/src/modules/brands/queries";
import { listSuppliersForSelect } from "@/src/modules/suppliers/queries";
import { getStockForProduct, listStockMovements } from "@/src/modules/stock/queries";
import { ProductDetailsForm } from "@/src/components/admin/product-details-form";
import { PriceAdjustmentForm } from "@/src/components/admin/price-adjustment-form";
import { StockMovementForm, StockCorrectionForm } from "@/src/components/admin/stock-form";
import { BackLink } from "@/src/components/admin/back-link";
import { formatCents } from "@/src/lib/currency";

export const metadata: Metadata = { title: "Editar produto — AtlHub" };

const REASON_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
};

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [product, categoryOptions, brandOptions, supplierOptions] = await Promise.all([
    getProduct(id),
    listCategoriesForSelect(),
    listBrandsForSelect(),
    listSuppliersForSelect(),
  ]);

  if (!product) notFound();

  const [currentStock, stockMovements] = await Promise.all([
    getStockForProduct(id),
    listStockMovements(id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href="/admin/produtos" label="Voltar para produtos" />
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-muted-foreground">SKU {product.sku}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do produto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductDetailsForm
            productId={product.id}
            product={product}
            categoryOptions={categoryOptions}
            brandOptions={brandOptions}
            supplierOptions={supplierOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preço</CardTitle>
          <CardDescription>
            Preço atual: {product.prices[0] ? formatCents(product.prices[0].priceCents) : "—"}.
            Ajustar aqui nunca sobrescreve o histórico — sempre entra uma linha nova.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PriceAdjustmentForm productId={product.id} />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preço</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Vigente desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{formatCents(price.priceCents)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {price.source === "AJUSTE_MANUAL" ? "Ajuste manual" : "Sincronização"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(price.effectiveFrom)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estoque</CardTitle>
          <CardDescription>
            Quantidade atual: <span className="font-semibold text-foreground">{currentStock}</span>.
            Cada entrada/saída/correção fica registrada no histórico abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <StockMovementForm productId={product.id} />
          <StockCorrectionForm productId={product.id} currentStock={currentStock} />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{REASON_LABEL[movement.reason]}</TableCell>
                  <TableCell className={movement.quantityDelta < 0 ? "text-destructive" : ""}>
                    {movement.quantityDelta > 0 ? "+" : ""}
                    {movement.quantityDelta}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{movement.note ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(movement.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {stockMovements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma movimentação ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
