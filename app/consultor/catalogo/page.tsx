import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireApprovedUser } from "@/src/modules/auth/dal";
import { listActiveProducts } from "@/src/modules/products/queries";
import { listCategoriesForSelect } from "@/src/modules/categories/queries";
import { listBrandsForSelect } from "@/src/modules/brands/queries";
import { formatCents } from "@/src/lib/currency";
import { ShareButton } from "@/src/components/consultor/share-button";
import { buildQueryHref } from "@/src/lib/query-href";
import { FilterLink } from "@/src/components/filter-link";

export const metadata: Metadata = { title: "Catálogo — AtlHub" };

type SearchParams = { categoria?: string; marca?: string; q?: string };

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireApprovedUser();
  const params = await searchParams;

  const [products, categories, brands] = await Promise.all([
    listActiveProducts({ categoryId: params.categoria, brandId: params.marca, q: params.q }),
    listCategoriesForSelect(),
    listBrandsForSelect(),
  ]);

  const buildHref = (overrides: Partial<SearchParams>) =>
    buildQueryHref("/consultor/catalogo", params, overrides);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catálogo</h1>
          <p className="text-muted-foreground">
            Produtos ativos da Atlântica Natural, com preço sempre atualizado.
          </p>
        </div>
        <ShareButton targetType="CATALOGO" />
      </div>

      <form className="flex max-w-sm gap-2">
        {params.categoria && <input type="hidden" name="categoria" value={params.categoria} />}
        {params.marca && <input type="hidden" name="marca" value={params.marca} />}
        <Input name="q" defaultValue={params.q} placeholder="Buscar por nome ou SKU…" />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterLink label="Todas categorias" href={buildHref({ categoria: undefined })} active={!params.categoria} />
        {categories.map((category) => (
          <FilterLink
            key={category.id}
            label={category.name}
            href={buildHref({ categoria: category.id })}
            active={params.categoria === category.id}
          />
        ))}
      </div>

      {brands.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterLink label="Todas marcas" href={buildHref({ marca: undefined })} active={!params.marca} />
          {brands.map((brand) => (
            <FilterLink
              key={brand.id}
              label={brand.name}
              href={buildHref({ marca: brand.id })}
              active={params.marca === brand.id}
            />
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-muted-foreground">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link key={product.id} href={`/consultor/catalogo/${product.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                {product.images[0] && (
                  <div className="relative mx-4 aspect-square overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    {product.category && (
                      <Badge variant="outline">{product.category.name}</Badge>
                    )}
                  </div>
                  {product.brand && (
                    <p className="text-xs text-muted-foreground">{product.brand.name}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {product.prices[0] ? formatCents(product.prices[0].priceCents) : "Consulte"}
                  </p>
                  {/* Estoque não é sincronizado da loja pública (ver PROJECT.md
                      seção 16.5) — mostrar "Esgotado" pra um produto IMPORTADO
                      seria um falso negativo, não um estoque real conferido. */}
                  {product.source !== "IMPORTADO" && product.stock <= 0 && (
                    <Badge variant="destructive" className="mt-2">
                      Esgotado
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
