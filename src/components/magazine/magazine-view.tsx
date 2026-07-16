import Image from "next/image";

import { formatCents } from "@/src/lib/currency";
import { MAGAZINE_FILTER_LABELS } from "@/src/modules/magazine/schemas";
import type { ProductSnapshotItem } from "@/src/modules/magazine/generator";
import type { MagazineFilterType } from "@/src/generated/prisma/client";
import { monthLabelFor } from "@/src/components/magazine/magazine-cover-preview";

export type MagazineIssueForView = {
  title: string;
  filterType: MagazineFilterType;
  productSnapshot: unknown;
  publishedAt: Date | null;
  createdAt: Date;
};

// Componente único reaproveitado em três lugares: preview do admin
// (/admin/revista/[id]), leitor do consultor (/consultor/revista/[id]) e a
// página pública de QR Code (/c/[slug], destino REVISTA) — ver PROJECT.md.
// Sempre a mesma renderização, ninguém vê uma versão diferente da outra.
export function MagazineView({ issue }: { issue: MagazineIssueForView }) {
  const products = (issue.productSnapshot ?? []) as ProductSnapshotItem[];
  const refDate = issue.publishedAt ?? issue.createdAt;

  return (
    <div className="magazine-theme overflow-hidden rounded-xl">
      <div
        className="flex flex-col items-center justify-center gap-4 p-10 text-center sm:aspect-[16/6]"
        style={{ background: "linear-gradient(135deg, var(--magazine-primary), oklch(0.24 0.05 155))" }}
      >
        <span className="text-xs uppercase tracking-[0.3em] text-[var(--magazine-primary-foreground)] opacity-80">
          Atlântica Natural
        </span>
        <span className="font-[var(--magazine-font-display)] text-4xl font-semibold text-[var(--magazine-primary-foreground)] sm:text-5xl">
          AtlHub
        </span>
        <span className="rounded-full bg-[var(--magazine-accent)] px-4 py-1 text-sm font-medium text-[var(--magazine-accent-foreground)]">
          {monthLabelFor(refDate)}
        </span>
        <h1 className="font-[var(--magazine-font-display)] max-w-md text-2xl font-medium text-[var(--magazine-primary-foreground)] sm:text-3xl">
          {issue.title}
        </h1>
        <span className="text-xs text-[var(--magazine-primary-foreground)] opacity-80">
          {MAGAZINE_FILTER_LABELS[issue.filterType]}
        </span>
      </div>

      <div className="px-4 py-10 sm:px-8">
        {products.length === 0 ? (
          <p className="text-center text-[var(--magazine-muted)]">
            Nenhum produto encontrado para esse filtro no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductPage key={product.productId} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductPage({ product }: { product: ProductSnapshotItem }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--magazine-border)] bg-[var(--magazine-surface)]">
      <div className="relative aspect-square bg-[var(--magazine-bg)]">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--magazine-muted)]">
            Sem foto
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.categoryName && (
          <span className="text-xs tracking-wide text-[var(--magazine-muted)] uppercase">
            {product.categoryName}
          </span>
        )}
        <h3 className="font-[var(--magazine-font-display)] leading-snug font-medium">{product.name}</h3>
        {/* Só renderiza se a loja tiver exposto descrição/benefício — a
            maioria dos produtos sincronizados não tem esse dado, e o
            template nunca inventa texto pra preencher o vazio. */}
        {product.description && (
          <p className="line-clamp-3 text-sm text-[var(--magazine-muted)]">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-lg font-semibold text-[var(--magazine-primary)]">
            {product.priceCents !== null ? formatCents(product.priceCents) : "Consulte"}
          </span>
          {product.storeUrl && (
            <a
              href={product.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[var(--magazine-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--magazine-primary-foreground)] transition-opacity hover:opacity-90"
            >
              Comprar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
