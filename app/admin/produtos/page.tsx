import type { Metadata } from "next";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/src/modules/auth/dal";
import { listProducts } from "@/src/modules/products/queries";
import { listCategoriesForSelect } from "@/src/modules/categories/queries";
import { listBrandsForSelect } from "@/src/modules/brands/queries";
import { formatCents } from "@/src/lib/currency";
import { LOW_STOCK_THRESHOLD } from "@/src/modules/stock/queries";
import { buildQueryHref } from "@/src/lib/query-href";
import { FilterLink } from "@/src/components/filter-link";

export const metadata: Metadata = { title: "Produtos — AtlHub" };

type SearchParams = {
  q?: string;
  categoria?: string;
  marca?: string;
  status?: string;
  estoque?: string;
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [products, categories, brands] = await Promise.all([
    listProducts({
      q: params.q,
      categoryId: params.categoria,
      brandId: params.marca,
      active: params.status === "ativo" ? true : params.status === "inativo" ? false : undefined,
      lowStock: params.estoque === "baixo",
    }),
    listCategoriesForSelect(),
    listBrandsForSelect(),
  ]);

  const buildHref = (overrides: Partial<SearchParams>) =>
    buildQueryHref("/admin/produtos", params, overrides);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-muted-foreground">
            Cadastro manual, import CSV, e produtos sincronizados automaticamente da{" "}
            <Link href="/admin/loja" className="underline underline-offset-4">
              loja pública
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/produtos/exportar">Exportar CSV</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/produtos/importar">Importar CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/produtos/novo">Novo produto</Link>
          </Button>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome ou SKU…"
          className="max-w-xs"
        />
        {params.categoria && <input type="hidden" name="categoria" value={params.categoria} />}
        {params.marca && <input type="hidden" name="marca" value={params.marca} />}
        {params.status && <input type="hidden" name="status" value={params.status} />}
        {params.estoque && <input type="hidden" name="estoque" value={params.estoque} />}
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink label="Todas categorias" href={buildHref({ categoria: undefined })} active={!params.categoria} />
        {categories.map((c) => (
          <FilterLink
            key={c.id}
            label={c.name}
            href={buildHref({ categoria: c.id })}
            active={params.categoria === c.id}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink label="Todas marcas" href={buildHref({ marca: undefined })} active={!params.marca} />
        {brands.map((b) => (
          <FilterLink
            key={b.id}
            label={b.name}
            href={buildHref({ marca: b.id })}
            active={params.marca === b.id}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink label="Todos" href={buildHref({ status: undefined })} active={!params.status} />
        <FilterLink label="Ativos" href={buildHref({ status: "ativo" })} active={params.status === "ativo"} />
        <FilterLink label="Inativos" href={buildHref({ status: "inativo" })} active={params.status === "inativo"} />
        <FilterLink
          label={`Estoque baixo (< ${LOW_STOCK_THRESHOLD})`}
          href={buildHref({ estoque: params.estoque === "baixo" ? undefined : "baixo" })}
          active={params.estoque === "baixo"}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Preço atual</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="text-muted-foreground">{product.sku}</TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category?.name ?? "—"}</TableCell>
              <TableCell>{product.brand?.name ?? "—"}</TableCell>
              <TableCell>
                {product.prices[0] ? formatCents(product.prices[0].priceCents) : "—"}
              </TableCell>
              <TableCell className={product.stock < LOW_STOCK_THRESHOLD ? "text-destructive" : ""}>
                {product.stock}
              </TableCell>
              <TableCell>
                <Badge variant={product.active ? "default" : "secondary"}>
                  {product.active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/produtos/${product.id}`}>Editar</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Nenhum produto encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
