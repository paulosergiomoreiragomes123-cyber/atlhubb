import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/src/modules/auth/dal";
import { listCategoriesForSelect } from "@/src/modules/categories/queries";
import { listBrandsForSelect } from "@/src/modules/brands/queries";
import { listSuppliersForSelect } from "@/src/modules/suppliers/queries";
import { ProductCreateForm } from "@/src/components/admin/product-create-form";
import { BackLink } from "@/src/components/admin/back-link";

export const metadata: Metadata = { title: "Novo produto — AtlHub" };

export default async function NovoProdutoPage() {
  await requireAdmin();
  const [categoryOptions, brandOptions, supplierOptions] = await Promise.all([
    listCategoriesForSelect(),
    listBrandsForSelect(),
    listSuppliersForSelect(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href="/admin/produtos" label="Voltar para produtos" />
      <div>
        <h1 className="text-2xl font-semibold">Novo produto</h1>
        <p className="text-muted-foreground">
          Todo produto nasce com um preço inicial — ajustes futuros ficam no
          histórico, na tela de edição.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do produto</CardTitle>
          <CardDescription>SKU precisa ser único.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductCreateForm
            categoryOptions={categoryOptions}
            brandOptions={brandOptions}
            supplierOptions={supplierOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
