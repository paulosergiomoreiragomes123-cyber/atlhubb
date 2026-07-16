import { requireAdmin } from "@/src/modules/auth/dal";
import { listProductsForExport } from "@/src/modules/products/queries";
import { buildProductsCsv } from "@/src/modules/products/csv";

export async function GET() {
  await requireAdmin();

  const products = await listProductsForExport();
  const csv = buildProductsCsv(products);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="catalogo-atlhub.csv"`,
    },
  });
}
