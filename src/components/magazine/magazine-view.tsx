import "server-only";
import Image from "next/image";
import QRCode from "qrcode";

import { formatCents } from "@/src/lib/currency";
import { buildWhatsappLink } from "@/src/lib/whatsapp";
import { MAGAZINE_FILTER_LABELS } from "@/src/modules/magazine/schemas";
import { getCategoryWebClasses } from "@/src/modules/magazine/category-colors";
import type { ProductSnapshotItem } from "@/src/modules/magazine/generator";
import type { MagazineFilterType } from "@/src/generated/prisma/client";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

function monthLabelFor(date: Date): string {
  return `${MONTHS_PT[date.getMonth()]} ${date.getFullYear()}`;
}

export type ConsultantInfo = {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  instagram: string | null;
  photoUrl: string | null;
};

export type MagazineIssueForView = {
  title: string;
  filterTypes: MagazineFilterType[];
  productSnapshot: unknown;
  publishedAt: Date | null;
  createdAt: Date;
};

// Componente único reaproveitado em quatro lugares: preview do admin
// (/admin/revista/[id]), leitor do consultor (/consultor/revista[/[id]]),
// a página pública de QR Code (/c/[slug]) e o gerador de PDF sob demanda
// (pdf-template.tsx é um template separado — react-pdf não renderiza JSX de
// DOM — mas segue exatamente a mesma estrutura de conteúdo). `consultant` é
// sempre de quem está vendo/baixando NA HORA, nunca um dado fixo da edição
// — é isso que torna a revista pessoal por consultor (ver PROJECT.md).
export async function MagazineView({
  issue,
  consultant,
}: {
  issue: MagazineIssueForView;
  consultant: ConsultantInfo;
}) {
  const products = (issue.productSnapshot ?? []) as ProductSnapshotItem[];
  const refDate = issue.publishedAt ?? issue.createdAt;
  const coverImageUrl = products[0]?.imageUrl ?? null;
  const whatsappCtaLink = buildWhatsappLink(
    consultant.whatsapp,
    `Olá! Vi a revista da Atlântica Natural e quero saber mais.`
  );
  const qrDataUrl = whatsappCtaLink ? await QRCode.toDataURL(whatsappCtaLink, { width: 240, margin: 1 }) : null;

  return (
    <div className="magazine-theme flex flex-col overflow-hidden rounded-xl">
      <Cover
        title={issue.title}
        refDate={refDate}
        filterTypes={issue.filterTypes}
        coverImageUrl={coverImageUrl}
      />

      <div className="px-4 py-10 sm:px-8">
        {products.length === 0 ? (
          <p className="text-center text-[var(--magazine-muted)]">
            Nenhum produto encontrado para esse filtro no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductPage key={product.productId} product={product} consultant={consultant} />
            ))}
          </div>
        )}
      </div>

      <ConsultantFooter consultant={consultant} />

      <FinalSection consultant={consultant} whatsappLink={whatsappCtaLink} qrDataUrl={qrDataUrl} />
    </div>
  );
}

function Cover({
  title,
  refDate,
  filterTypes,
  coverImageUrl,
}: {
  title: string;
  refDate: Date;
  filterTypes: MagazineFilterType[];
  coverImageUrl: string | null;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden p-10 text-center sm:aspect-[16/7]">
      {coverImageUrl && (
        <Image
          src={coverImageUrl}
          alt=""
          fill
          className="object-cover opacity-25"
          unoptimized
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, var(--magazine-primary), oklch(0.24 0.05 155))" }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="text-xs tracking-[0.3em] text-[var(--magazine-primary-foreground)] uppercase opacity-80">
          Atlântica Natural
        </span>
        <span className="font-[var(--magazine-font-display)] text-4xl font-semibold text-[var(--magazine-primary-foreground)] sm:text-5xl">
          AtlHub
        </span>
        <span className="text-sm font-medium tracking-wide text-[var(--magazine-primary-foreground)] uppercase opacity-90">
          Revista Digital
        </span>
        <span className="rounded-full bg-[var(--magazine-accent)] px-4 py-1 text-sm font-medium text-[var(--magazine-accent-foreground)]">
          {monthLabelFor(refDate)}
        </span>
        <h1 className="font-[var(--magazine-font-display)] max-w-md text-2xl font-medium text-[var(--magazine-primary-foreground)] sm:text-3xl">
          {title}
        </h1>
        <span className="text-xs text-[var(--magazine-primary-foreground)] opacity-80">
          {filterTypes.map((f) => MAGAZINE_FILTER_LABELS[f]).join(" · ")}
        </span>
      </div>
    </div>
  );
}

function ProductPage({
  product,
  consultant,
}: {
  product: ProductSnapshotItem;
  consultant: ConsultantInfo;
}) {
  const whatsappLink = buildWhatsappLink(
    consultant.whatsapp,
    `Olá! Tenho interesse no produto "${product.name}" (Código ${product.sku}).`
  );

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
        <div className="flex flex-wrap items-center gap-1.5">
          {product.categoryName && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryWebClasses(product.categoryName)}`}>
              {product.categoryName}
            </span>
          )}
          {product.volume && (
            <span className="rounded-full bg-[var(--magazine-bg)] px-2 py-0.5 text-xs text-[var(--magazine-muted)]">
              {product.volume}
            </span>
          )}
        </div>
        <h3 className="font-[var(--magazine-font-display)] leading-snug font-medium">{product.name}</h3>
        <span className="text-xs text-[var(--magazine-muted)]">Código {product.sku}</span>

        {/* Só renderiza quando a loja/Guia realmente têm o dado — nunca
            inventa descrição, benefício ou modo de uso. */}
        {product.description && (
          <p className="line-clamp-3 text-sm text-[var(--magazine-muted)]">{product.description}</p>
        )}
        {product.beneficios && (
          <div className="text-xs text-[var(--magazine-text)]">
            <span className="font-semibold">Sobre o produto (Guia Oficial): </span>
            <span className="line-clamp-4">{product.beneficios}</span>
          </div>
        )}
        {product.modoDeUso && (
          <div className="text-xs text-[var(--magazine-text)]">
            <span className="font-semibold">Modo de uso: </span>
            <span className="line-clamp-3">{product.modoDeUso}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-lg font-semibold text-[var(--magazine-primary)]">
            {product.priceCents !== null ? formatCents(product.priceCents) : "Consulte"}
          </span>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[var(--magazine-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--magazine-primary-foreground)] transition-opacity hover:opacity-90"
            >
              💬 Peça pelo WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultantFooter({ consultant }: { consultant: ConsultantInfo }) {
  const lines = [
    { label: "Consultor", value: consultant.name },
    { label: "Telefone", value: consultant.phone },
    { label: "WhatsApp", value: consultant.whatsapp },
    { label: "Cidade", value: consultant.city },
    { label: "Instagram", value: consultant.instagram },
  ].filter((line) => line.value);

  if (lines.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-[var(--magazine-border)] bg-[var(--magazine-bg)] px-4 py-4 text-xs text-[var(--magazine-muted)]">
      {lines.map((line) => (
        <span key={line.label}>
          <span className="font-semibold text-[var(--magazine-text)]">{line.label}:</span> {line.value}
        </span>
      ))}
    </div>
  );
}

function FinalSection({
  consultant,
  whatsappLink,
  qrDataUrl,
}: {
  consultant: ConsultantInfo;
  whatsappLink: string | null;
  qrDataUrl: string | null;
}) {
  if (!whatsappLink) return null;

  return (
    <div className="flex flex-col items-center gap-4 bg-[var(--magazine-primary)] px-6 py-12 text-center text-[var(--magazine-primary-foreground)]">
      <h2 className="font-[var(--magazine-font-display)] text-2xl font-medium">
        Gostou de algum produto?
      </h2>
      <p className="max-w-sm text-sm opacity-90">Entre em contato comigo pelo WhatsApp.</p>

      {qrDataUrl && (
        <div className="relative h-40 w-40 overflow-hidden rounded-lg bg-white p-2">
          <Image src={qrDataUrl} alt="QR Code do WhatsApp" fill className="object-contain" unoptimized />
        </div>
      )}

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-[var(--magazine-accent)] px-5 py-2 text-sm font-semibold text-[var(--magazine-accent-foreground)]"
      >
        💬 Falar no WhatsApp
      </a>

      <div className="flex flex-col items-center gap-2 pt-4">
        {consultant.photoUrl && (
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--magazine-primary-foreground)]">
            <Image src={consultant.photoUrl} alt={consultant.name} fill className="object-cover" unoptimized />
          </div>
        )}
        <span className="font-medium">{consultant.name}</span>
        {consultant.phone && <span className="text-sm opacity-90">{consultant.phone}</span>}
        {consultant.city && <span className="text-sm opacity-90">{consultant.city}</span>}
      </div>
    </div>
  );
}
