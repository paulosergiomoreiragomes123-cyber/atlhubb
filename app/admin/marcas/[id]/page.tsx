import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/src/modules/auth/dal";
import { getBrand } from "@/src/modules/brands/queries";
import { BrandForm } from "@/src/components/admin/brand-form";
import { BackLink } from "@/src/components/admin/back-link";

export const metadata: Metadata = { title: "Editar marca — AtlHub" };

export default async function EditarMarcaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const brand = await getBrand(id);
  if (!brand) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href="/admin/marcas" label="Voltar para marcas" />
      <div>
        <h1 className="text-2xl font-semibold">Editar marca</h1>
        <p className="text-muted-foreground">{brand.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da marca</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm brand={brand} />
        </CardContent>
      </Card>
    </div>
  );
}
