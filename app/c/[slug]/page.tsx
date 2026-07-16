import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getQrCodeBySlug, incrementScanCount } from "@/src/modules/qrcode/queries";
import { listActiveProducts } from "@/src/modules/products/queries";
import { formatCents } from "@/src/lib/currency";
import { getMyProfile, buildConsultantInfo } from "@/src/modules/profile/queries";
import { MagazineView, type ConsultantInfo, type MagazineIssueForView } from "@/src/components/magazine/magazine-view";

export const metadata: Metadata = { title: "AtlHub" };

export default async function CompartilhamentoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const qrCode = await getQrCodeBySlug(slug);
  if (!qrCode) notFound();

  // Roda depois da resposta ser enviada (after) — não atrasa a página pública
  // esperando o UPDATE do contador, e best-effort: uma falha aqui não derruba
  // a página (só loga).
  after(() =>
    incrementScanCount(qrCode.id).catch((error) => {
      console.error("[qrcode] Falha ao registrar acesso:", error);
    })
  );

  if (qrCode.targetType === "PRODUTO") {
    if (!qrCode.product || !qrCode.product.active) notFound();
    return <ProdutoPublico product={qrCode.product} />;
  }

  if (qrCode.targetType === "REVISTA") {
    if (!qrCode.magazineIssue || qrCode.magazineIssue.status !== "PUBLICADA") notFound();

    // Sem relação FK entre QrCode e User (proposital, ver
    // src/modules/qrcode/queries.ts) — segunda query pra achar o perfil de
    // quem gerou o link. É esse consultor que quem escaneia o QR Code
    // contata, não um dado genérico da edição (ver PROJECT.md).
    const creatorProfile = qrCode.createdById ? await getMyProfile(qrCode.createdById) : null;
    const consultant = buildConsultantInfo(creatorProfile, "Atlântica Natural");

    return <RevistaPublica issue={qrCode.magazineIssue} consultant={consultant} />;
  }

  const products = await listActiveProducts();
  return <CatalogoPublico products={products} />;
}

function ProdutoPublico({
  product,
}: {
  product: {
    name: string;
    description: string | null;
    sku: string;
    category: { name: string } | null;
    brand: { name: string } | null;
    images: { url: string; alt: string | null }[];
    prices: { priceCents: number }[];
  };
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        {product.images.length > 0 && (
          <div className="relative mx-4 aspect-square overflow-hidden rounded-lg bg-muted">
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{product.name}</CardTitle>
            {product.category && <Badge variant="outline">{product.category.name}</Badge>}
          </div>
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand.name}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-2xl font-semibold">
            {product.prices[0] ? formatCents(product.prices[0].priceCents) : "Consulte"}
          </p>
          {product.description && (
            <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
          )}
          <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RevistaPublica({
  issue,
  consultant,
}: {
  issue: MagazineIssueForView;
  consultant: ConsultantInfo;
}) {
  return (
    <div className="mx-auto max-w-4xl pb-10">
      <MagazineView issue={issue} consultant={consultant} />
    </div>
  );
}

function CatalogoPublico({
  products,
}: {
  products: {
    id: string;
    name: string;
    category: { name: string } | null;
    images: { url: string }[];
    prices: { priceCents: number }[];
  }[];
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-semibold">Catálogo Atlântica Natural</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            {product.images[0] && (
              <div className="relative mx-4 aspect-square overflow-hidden rounded-lg bg-muted">
                <Image
                  src={product.images[0].url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{product.name}</CardTitle>
                {product.category && <Badge variant="outline">{product.category.name}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {product.prices[0] ? formatCents(product.prices[0].priceCents) : "Consulte"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
