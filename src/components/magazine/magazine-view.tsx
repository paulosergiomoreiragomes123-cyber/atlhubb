import "server-only";
import Image from "next/image";
import QRCode from "qrcode";

import { formatCents } from "@/src/lib/currency";
import { buildWhatsappLink } from "@/src/lib/whatsapp";
import { getCategoryWebTheme } from "@/src/modules/magazine/category-themes";
import { getCoverWebGradient, type CoverColor } from "@/src/modules/magazine/cover-colors";
import type { MagazineSection, ProductSnapshotItem } from "@/src/modules/magazine/generator";

const DEFAULT_MAGAZINE_MESSAGE = "Olá! Vi sua revista digital e gostaria de saber mais.";

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
  state: string | null;
  instagram: string | null;
  photoUrl: string | null;
  jobTitle: string | null;
  magazineMessage: string | null;
  coverColor: CoverColor;
  showQrCode: boolean;
  showPhoto: boolean;
  showInstagram: boolean;
  showCity: boolean;
};

export type MagazineIssueForView = {
  title: string;
  productSnapshot: unknown;
  publishedAt: Date | null;
  createdAt: Date;
};

type MagazineSnapshot = { sections: MagazineSection[] };

function isPerfumeSectionKey(key: string): boolean {
  return key.startsWith("perfumes");
}

// Componente único reaproveitado em três lugares: preview do admin
// (/admin/revista/[id]), leitor do consultor (/consultor/revista[/[id]]) e
// a página pública de QR Code (/c/[slug]) — sempre a versão web/catálogo
// (Magazine V3). O PDF baixado (Magazine V4, ver PROJECT.md) reaproveita as
// páginas da revista oficial impressa em vez desta view — não usa este
// componente (ver src/modules/magazine/official-pdf-assembler.ts).
// `consultant` é sempre de quem está vendo/baixando NA HORA — é isso que
// torna a revista pessoal por consultor, sem gerar uma edição por pessoa.
export async function MagazineView({
  issue,
  consultant,
}: {
  issue: MagazineIssueForView;
  consultant: ConsultantInfo;
}) {
  const snapshot = (issue.productSnapshot ?? { sections: [] }) as MagazineSnapshot;
  const sections = snapshot.sections ?? [];
  const refDate = issue.publishedAt ?? issue.createdAt;

  const whatsappCtaLink = buildWhatsappLink(
    consultant.whatsapp,
    consultant.magazineMessage || DEFAULT_MAGAZINE_MESSAGE
  );
  const qrDataUrl =
    whatsappCtaLink && consultant.showQrCode
      ? await QRCode.toDataURL(whatsappCtaLink, { width: 320, margin: 1 })
      : null;
  const footerQrDataUrl =
    whatsappCtaLink && consultant.showQrCode
      ? await QRCode.toDataURL(whatsappCtaLink, { width: 120, margin: 1 })
      : null;

  const firstPerfumeSectionKey = sections.find((section) => isPerfumeSectionKey(section.key))?.key;

  return (
    <div className="magazine-theme flex flex-col overflow-hidden rounded-xl">
      <Cover title={issue.title} refDate={refDate} consultant={consultant} qrDataUrl={qrDataUrl} />

      {sections.length === 0 ? (
        <p className="px-6 py-16 text-center text-[var(--magazine-muted)]">
          Nenhum produto encontrado no catálogo sincronizado.
        </p>
      ) : (
        sections.map((section) => {
          const showPerfumeIntro = section.key === firstPerfumeSectionKey;

          return (
            <div key={section.key}>
              {showPerfumeIntro && <PerfumeOlfactoryIntro />}
              <CategoryDivider title={section.title} count={section.products.length} />
              <div className="grid grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:px-8">
                {section.products.map((product) => (
                  <ProductCard key={product.productId} product={product} consultant={consultant} />
                ))}
              </div>
            </div>
          );
        })
      )}

      <ConsultantFooter consultant={consultant} qrDataUrl={footerQrDataUrl} />

      <FinalSection consultant={consultant} whatsappLink={whatsappCtaLink} qrDataUrl={qrDataUrl} />
    </div>
  );
}

function Cover({
  title,
  refDate,
  consultant,
  qrDataUrl,
}: {
  title: string;
  refDate: Date;
  consultant: ConsultantInfo;
  qrDataUrl: string | null;
}) {
  return (
    <div
      className="relative flex flex-col items-center gap-5 overflow-hidden px-8 py-16 text-center"
      style={{ background: getCoverWebGradient(consultant.coverColor) }}
    >
      <span className="text-xs tracking-[0.35em] text-white uppercase opacity-80">
        Atlântica Natural
      </span>
      <span className="font-[var(--magazine-font-display)] text-4xl font-semibold text-white sm:text-5xl">
        AtlHub
      </span>
      <span className="text-sm font-medium tracking-wide text-white uppercase opacity-90">
        Revista Digital
      </span>
      <span className="rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-[var(--magazine-primary)]">
        {monthLabelFor(refDate)}
      </span>
      <h1 className="font-[var(--magazine-font-display)] max-w-md text-2xl font-medium text-white sm:text-3xl">
        {title}
      </h1>

      <div className="mt-6 flex flex-col items-center gap-3">
        {consultant.photoUrl && consultant.showPhoto && (
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white/80">
            <Image src={consultant.photoUrl} alt={consultant.name} fill className="object-cover" unoptimized />
          </div>
        )}
        <span className="text-lg font-semibold text-white">{consultant.name}</span>
        {consultant.jobTitle && <span className="text-sm text-white opacity-90">{consultant.jobTitle}</span>}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white opacity-90">
          {consultant.showCity && consultant.city && <span>{consultant.city}</span>}
          {consultant.whatsapp && <span>{consultant.whatsapp}</span>}
          {consultant.showInstagram && consultant.instagram && <span>{consultant.instagram}</span>}
        </div>
        {qrDataUrl && (
          <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-lg bg-white p-1.5">
            <Image src={qrDataUrl} alt="QR Code do WhatsApp" fill className="object-contain" unoptimized />
          </div>
        )}
      </div>
    </div>
  );
}

// Duas páginas especiais, exatamente como as imagens oficiais enviadas
// (nunca recriadas como tabela HTML) — ficam sempre antes do catálogo
// automático de perfumes.
function PerfumeOlfactoryIntro() {
  return (
    <>
      <div className="relative aspect-[3/4] w-full bg-black">
        <Image
          src="/magazine/tabela-olfativa-masculina.jpg"
          alt="Tabela de notas olfativas — Masculino"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <div className="relative aspect-[3/4] w-full bg-white">
        <Image
          src="/magazine/tabela-olfativa-feminina.jpg"
          alt="Tabela de essências femininas"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </>
  );
}

function CategoryDivider({ title, count }: { title: string; count: number }) {
  const theme = getCategoryWebTheme(title);
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-14 text-center ${theme.divider}`}>
      <h2 className="font-[var(--magazine-font-display)] text-3xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h2>
      <span className="text-sm opacity-90">
        {count} {count === 1 ? "produto" : "produtos"}
      </span>
    </div>
  );
}

async function ProductCard({
  product,
  consultant,
}: {
  product: ProductSnapshotItem;
  consultant: ConsultantInfo;
}) {
  if (product.perfume) return <PerfumeCard product={product} consultant={consultant} />;

  const whatsappLink = buildWhatsappLink(
    consultant.whatsapp,
    `Olá! Tenho interesse no produto "${product.name}" (Código ${product.sku}).`
  );
  const qrDataUrl = whatsappLink ? await QRCode.toDataURL(whatsappLink, { width: 100, margin: 1 }) : null;
  const theme = getCategoryWebTheme(product.categoryName);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--magazine-border)] bg-[var(--magazine-surface)] shadow-sm">
      <div className="relative aspect-[4/3] bg-[var(--magazine-bg)]">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--magazine-muted)]">
            Sem foto
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-base font-bold text-[var(--magazine-primary)] shadow">
          {product.priceCents !== null ? formatCents(product.priceCents) : "Consulte"}
        </span>
        {/* "De/Por" só aparece quando existir um preço anterior real no
            histórico — nunca inventado (ver generator.ts). */}
        {product.compareAtPriceCents !== null && product.priceCents !== null && (
          <span className="absolute top-14 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs text-[var(--magazine-muted)] line-through">
            {formatCents(product.compareAtPriceCents)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {product.categoryName && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${theme.badge}`}>
              {product.categoryName}
            </span>
          )}
          {product.volume && (
            <span className="rounded-full bg-[var(--magazine-bg)] px-2 py-0.5 text-xs text-[var(--magazine-muted)]">
              {product.volume}
            </span>
          )}
        </div>
        <h3 className="font-[var(--magazine-font-display)] text-lg leading-snug font-medium">{product.name}</h3>
        <span className="text-xs text-[var(--magazine-muted)]">Código {product.sku}</span>

        {/* Só renderiza quando o Guia Oficial realmente tem o dado — nunca
            inventa descrição, benefício, modo de uso ou ingrediente. */}
        {product.description && (
          <div className="text-sm text-[var(--magazine-muted)]">
            <span className="font-semibold text-[var(--magazine-text)]">Para que serve: </span>
            {product.description}
          </div>
        )}
        {product.benefits && (
          <div className="text-sm text-[var(--magazine-text)]">
            <span className="font-semibold">Benefícios: </span>
            {product.benefits}
          </div>
        )}
        {product.howToUse && (
          <div className="text-sm text-[var(--magazine-text)]">
            <span className="font-semibold">Modo de uso: </span>
            {product.howToUse}
          </div>
        )}
        {product.ingredients && (
          <div className="text-xs text-[var(--magazine-muted)]">
            <span className="font-semibold text-[var(--magazine-text)]">Ingredientes: </span>
            {product.ingredients}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[var(--magazine-primary)] px-4 py-2 text-sm font-semibold text-[var(--magazine-primary-foreground)] transition-opacity hover:opacity-90"
            >
              💬 Fale com seu consultor
            </a>
          )}
          {qrDataUrl && (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-white p-1">
              <Image src={qrDataUrl} alt="QR Code" fill className="object-contain" unoptimized />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function PerfumeCard({
  product,
  consultant,
}: {
  product: ProductSnapshotItem;
  consultant: ConsultantInfo;
}) {
  const perfume = product.perfume!;
  const whatsappLink = buildWhatsappLink(
    consultant.whatsapp,
    `Olá! Tenho interesse no perfume "${product.name}".`
  );
  const qrDataUrl = whatsappLink ? await QRCode.toDataURL(whatsappLink, { width: 100, margin: 1 }) : null;
  const theme = getCategoryWebTheme(perfume.olfactoryCategory ?? "Perfumes");
  const volumeEntries = Object.entries(perfume.volumePrices);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--magazine-border)] bg-[var(--magazine-surface)] shadow-sm">
      <div className="relative aspect-[4/3] bg-[var(--magazine-bg)]">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--magazine-muted)]">
            Sem foto
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {perfume.olfactoryCategory && (
          <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${theme.badge}`}>
            {perfume.olfactoryCategory}
          </span>
        )}
        <h3 className="font-[var(--magazine-font-display)] text-lg leading-snug font-medium">{product.name}</h3>

        {perfume.inspiredBy && (
          <div className="text-sm text-[var(--magazine-text)]">
            <span className="font-semibold">Inspirado em: </span>
            {perfume.inspiredBy}
          </div>
        )}
        {(perfume.topNotes || perfume.heartNotes || perfume.baseNotes) && (
          <div className="space-y-0.5 text-xs text-[var(--magazine-muted)]">
            {perfume.topNotes && <div><span className="font-semibold text-[var(--magazine-text)]">Saída: </span>{perfume.topNotes}</div>}
            {perfume.heartNotes && <div><span className="font-semibold text-[var(--magazine-text)]">Corpo: </span>{perfume.heartNotes}</div>}
            {perfume.baseNotes && <div><span className="font-semibold text-[var(--magazine-text)]">Fundo: </span>{perfume.baseNotes}</div>}
          </div>
        )}
        {perfume.occasion && (
          <div className="text-sm text-[var(--magazine-text)]">
            <span className="font-semibold">Ocasião ideal: </span>
            {perfume.occasion}
          </div>
        )}
        <div className="text-xs text-[var(--magazine-muted)]">{perfume.careText}</div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex flex-wrap gap-3">
            {volumeEntries.map(([label, cents]) => (
              <span key={label} className="text-base font-semibold text-[var(--magazine-primary)]">
                {label}: {formatCents(cents)}
              </span>
            ))}
          </div>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[var(--magazine-primary)] px-4 py-2 text-sm font-semibold text-[var(--magazine-primary-foreground)] transition-opacity hover:opacity-90"
            >
              💬 Fale com seu consultor
            </a>
          )}
          {qrDataUrl && (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-white p-1">
              <Image src={qrDataUrl} alt="QR Code" fill className="object-contain" unoptimized />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultantFooter({
  consultant,
  qrDataUrl,
}: {
  consultant: ConsultantInfo;
  qrDataUrl: string | null;
}) {
  const lines = [
    { label: "Consultor", value: consultant.name },
    { label: "WhatsApp", value: consultant.whatsapp },
    { label: "Cidade", value: consultant.showCity ? consultant.city : null },
    { label: "Instagram", value: consultant.showInstagram ? consultant.instagram : null },
  ].filter((line) => line.value);

  if (lines.length === 0 && !(consultant.photoUrl && consultant.showPhoto) && !qrDataUrl) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[var(--magazine-border)] bg-[var(--magazine-bg)] px-4 py-4 text-xs text-[var(--magazine-muted)]">
      {consultant.photoUrl && consultant.showPhoto && (
        <div className="relative h-10 w-10 overflow-hidden rounded-full">
          <Image src={consultant.photoUrl} alt={consultant.name} fill className="object-cover" unoptimized />
        </div>
      )}
      {lines.map((line) => (
        <span key={line.label}>
          <span className="font-semibold text-[var(--magazine-text)]">{line.label}:</span> {line.value}
        </span>
      ))}
      {qrDataUrl && (
        <div className="relative h-10 w-10 overflow-hidden rounded bg-white p-0.5">
          <Image src={qrDataUrl} alt="QR Code" fill className="object-contain" unoptimized />
        </div>
      )}
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
    <div className="flex flex-col items-center gap-4 bg-[var(--magazine-primary)] px-6 py-14 text-center text-[var(--magazine-primary-foreground)]">
      {consultant.photoUrl && consultant.showPhoto && (
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[var(--magazine-primary-foreground)]">
          <Image src={consultant.photoUrl} alt={consultant.name} fill className="object-cover" unoptimized />
        </div>
      )}
      <span className="text-xl font-medium">{consultant.name}</span>
      {consultant.jobTitle && <span className="text-sm opacity-90">{consultant.jobTitle}</span>}

      <h2 className="font-[var(--magazine-font-display)] mt-2 text-2xl font-medium">
        Obrigado por conhecer nossa revista.
      </h2>
      <p className="max-w-sm text-sm opacity-90">Será um prazer atender você.</p>

      {qrDataUrl && consultant.showQrCode && (
        <div className="relative h-48 w-48 overflow-hidden rounded-lg bg-white p-2">
          <Image src={qrDataUrl} alt="QR Code do WhatsApp" fill className="object-contain" unoptimized />
        </div>
      )}

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-[var(--magazine-accent)] px-5 py-2 text-sm font-semibold text-[var(--magazine-accent-foreground)]"
      >
        💬 Fale com seu consultor
      </a>

      <div className="flex flex-col items-center gap-1 pt-2 text-sm opacity-90">
        {consultant.showCity && consultant.city && <span>{consultant.city}</span>}
        {consultant.whatsapp && <span>WhatsApp: {consultant.whatsapp}</span>}
        {consultant.showInstagram && consultant.instagram && <span>{consultant.instagram}</span>}
      </div>
    </div>
  );
}
