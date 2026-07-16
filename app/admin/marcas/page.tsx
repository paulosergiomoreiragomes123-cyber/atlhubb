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
import { listBrands } from "@/src/modules/brands/queries";
import { BrandForm } from "@/src/components/admin/brand-form";
import { deleteBrandAction } from "@/src/modules/brands/actions";

export const metadata: Metadata = { title: "Marcas — AtlHub" };

export default async function MarcasPage() {
  await requireAdmin();
  const brands = await listBrands();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Marcas</h1>
        <p className="text-muted-foreground">Marcas dos produtos do catálogo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova marca</CardTitle>
          <CardDescription>O slug é preenchido automaticamente a partir do nome.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandForm />
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((brand) => (
            <TableRow key={brand.id}>
              <TableCell className="font-medium">{brand.name}</TableCell>
              <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
              <TableCell>{brand._count.products}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/marcas/${brand.id}`}>Editar</Link>
                  </Button>
                  <form action={deleteBrandAction.bind(null, brand.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      disabled={brand._count.products > 0}
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
