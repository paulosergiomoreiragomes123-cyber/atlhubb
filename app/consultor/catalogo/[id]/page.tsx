import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireApprovedUser } from "@/src/modules/auth/dal";
import { getActiveProduct } from "@/src/modules/products/queries";
import { getStockForProduct } from "@/src/modules/stock/queries";
import { formatCents } from "@/src/lib/currency";
import { ShareButton } from "@/src/components/consultor/share-button";

export const metadata: Metadata = { title: "Produto — AtlHub" };

export default async function FichaProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApprovedUser();
  const { id } = await params;

  const product = await getActiveProduct(id);
  if (!product) notFound();

  const stock = await getStockForProduct(id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/consultor/catalogo"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar ao catálogo
        </Link>
        <ShareButton targetType="PRODUTO" productId={product.id} />
      </div>

      <Card>
        {product.images.length > 0 && (
          <div className="flex flex-col gap-2 px-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt ?? product.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.slice(1).map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={image.url}
                      alt={image.alt ?? product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{product.name}</CardTitle>
            {product.category && <Badge variant="outline">{product.category.name}</Badge>}
          </div>
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand.name}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold">
              {product.prices[0] ? formatCents(product.prices[0].priceCents) : "Consulte"}
            </p>
            {/* Estoque não é sincronizado da loja pública (ver PROJECT.md
                seção 16.5) — sem selo de estoque pra produto IMPORTADO em vez
                de um falso "Esgotado"/"Últimas unidades". */}
            {product.source !== "IMPORTADO" &&
              (stock <= 0 ? (
                <Badge variant="destructive">Esgotado</Badge>
              ) : stock < 5 ? (
                <Badge variant="secondary">Últimas unidades</Badge>
              ) : null)}
          </div>
          {product.description && (
            <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
          )}
          <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
        </CardContent>
      </Card>
    </div>
  );
}
