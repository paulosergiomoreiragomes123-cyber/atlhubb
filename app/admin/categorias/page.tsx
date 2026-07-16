import type { Metadata } from "next";
import Link from "next/link";

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
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/src/modules/auth/dal";
import { listCategories, listCategoriesForSelect } from "@/src/modules/categories/queries";
import { CategoryForm } from "@/src/components/admin/category-form";
import { deleteCategoryAction } from "@/src/modules/categories/actions";

export const metadata: Metadata = { title: "Categorias — AtlHub" };

export default async function CategoriasPage() {
  await requireAdmin();
  const [categories, categoryOptions] = await Promise.all([
    listCategories(),
    listCategoriesForSelect(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorias</h1>
        <p className="text-muted-foreground">
          Organize o catálogo em categorias e subcategorias.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova categoria</CardTitle>
          <CardDescription>
            O slug é preenchido automaticamente a partir do nome, mas pode ser ajustado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm categoryOptions={categoryOptions} />
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Categoria-pai</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-muted-foreground">{category.slug}</TableCell>
              <TableCell>{category.parent?.name ?? "—"}</TableCell>
              <TableCell>{category._count.products}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/categorias/${category.id}`}>Editar</Link>
                  </Button>
                  <form action={deleteCategoryAction.bind(null, category.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      disabled={category._count.products > 0 || category._count.children > 0}
                    >
                      Excluir
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
