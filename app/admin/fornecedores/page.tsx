import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
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
import { listSuppliers } from "@/src/modules/suppliers/queries";
import { SupplierForm } from "@/src/components/admin/supplier-form";
import { deleteSupplierAction } from "@/src/modules/suppliers/actions";

export const metadata: Metadata = { title: "Fornecedores — AtlHub" };

export default async function FornecedoresPage() {
  await requireAdmin();
  const suppliers = await listSuppliers();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fornecedores</h1>
        <p className="text-muted-foreground">Contatos de quem fornece os produtos do catálogo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm />
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell>{supplier.contactName ?? "—"}</TableCell>
              <TableCell>{supplier.email ?? "—"}</TableCell>
              <TableCell>{supplier.phone ?? "—"}</TableCell>
              <TableCell>{supplier._count.products}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/fornecedores/${supplier.id}`}>Editar</Link>
                  </Button>
                  <form action={deleteSupplierAction.bind(null, supplier.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      disabled={supplier._count.products > 0}
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
