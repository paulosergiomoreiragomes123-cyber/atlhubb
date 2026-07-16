import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/src/modules/auth/dal";
import { getSupplier } from "@/src/modules/suppliers/queries";
import { SupplierForm } from "@/src/components/admin/supplier-form";
import { BackLink } from "@/src/components/admin/back-link";

export const metadata: Metadata = { title: "Editar fornecedor — AtlHub" };

export default async function EditarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href="/admin/fornecedores" label="Voltar para fornecedores" />
      <div>
        <h1 className="text-2xl font-semibold">Editar fornecedor</h1>
        <p className="text-muted-foreground">{supplier.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm supplier={supplier} />
        </CardContent>
      </Card>
    </div>
  );
}
