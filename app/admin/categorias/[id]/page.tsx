import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/src/modules/auth/dal";
import { getCategory, listCategoriesForSelect } from "@/src/modules/categories/queries";
import { CategoryForm } from "@/src/components/admin/category-form";
import { BackLink } from "@/src/components/admin/back-link";

export const metadata: Metadata = { title: "Editar categoria — AtlHub" };

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [category, categoryOptions] = await Promise.all([
    getCategory(id),
    listCategoriesForSelect(),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href="/admin/categorias" label="Voltar para categorias" />
      <div>
        <h1 className="text-2xl font-semibold">Editar categoria</h1>
        <p className="text-muted-foreground">{category.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da categoria</CardTitle>
          <CardDescription>Alterar o nome não muda o slug automaticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm category={category} categoryOptions={categoryOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
