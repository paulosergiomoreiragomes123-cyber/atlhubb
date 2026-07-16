import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/src/modules/auth/dal";
import { CsvImportForm } from "@/src/components/admin/csv-import-form";

export const metadata: Metadata = { title: "Importar produtos — AtlHub" };

export default async function ImportarProdutosPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar produtos</h1>
        <p className="text-muted-foreground">
          Cadastre ou atualize vários produtos de uma vez via planilha — sem
          integração com loja externa (ver{" "}
          <Link href="/admin/produtos/exportar" className="underline underline-offset-4">
            exportar o catálogo atual
          </Link>{" "}
          para usar como ponto de partida).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formato do arquivo</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Colunas: <code>sku</code>, <code>name</code>, <code>description</code>,{" "}
              <code>category_slug</code>, <code>brand_slug</code>,{" "}
              <code>supplier_name</code>, <code>price</code>, <code>stock</code>,{" "}
              <code>active</code>, <code>image_urls</code>.
            </span>
            <span className="block">
              Só <code>sku</code>, <code>name</code> e <code>price</code> são
              obrigatórios — e <code>price</code> só é obrigatório para produto
              novo. Produto identificado por SKU: se já existe, atualiza; se não
              existe, cria.
            </span>
            <span className="block">
              <code>price</code> e <code>stock</code> só geram uma linha nova no
              respectivo histórico se o valor for diferente do atual —{" "}
              <code>stock</code> é a quantidade final desejada, não um delta.{" "}
              <code>image_urls</code> aceita várias URLs separadas por{" "}
              <code>|</code> (pipe) e substitui a galeria inteira do produto.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CsvImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
