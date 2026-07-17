import fs from "node:fs";
import path from "node:path";
import React from "react";
import QRCode from "qrcode";
import {
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import { formatCents } from "@/src/lib/currency";
import { buildWhatsappLink } from "@/src/lib/whatsapp";
import { getCategoryPdfTheme } from "@/src/modules/magazine/category-themes";
import { getCoverPdfColor } from "@/src/modules/magazine/cover-colors";
import type { MagazineSection, ProductSnapshotItem } from "@/src/modules/magazine/generator";
import type { ConsultantInfo } from "@/src/components/magazine/magazine-view";

const DEFAULT_MAGAZINE_MESSAGE = "Olá! Vi sua revista digital e gostaria de saber mais.";

const COLORS = {
  text: "#2A2A2A",
  muted: "#6B6B6B",
  border: "#E5E1D8",
  bg: "#FBF8F1",
  surface: "#FFFFFF",
  accent: "#D9A441",
  accentForeground: "#3D2E10",
};

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.bg, fontSize: 10, color: COLORS.text, paddingBottom: 40, fontFamily: "Helvetica" },
  cover: { height: "100%", alignItems: "center", justifyContent: "center", gap: 8, padding: 40 },
  coverKicker: { fontSize: 11, color: "#FFFFFF", letterSpacing: 3, opacity: 0.85, fontFamily: "Times-Roman" },
  coverWordmark: { fontSize: 40, color: "#FFFFFF", fontFamily: "Times-Bold" },
  coverSubtitle: { fontSize: 13, color: "#FFFFFF", letterSpacing: 2, fontFamily: "Times-Roman" },
  coverBadge: { backgroundColor: COLORS.accent, color: COLORS.accentForeground, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16, fontSize: 12 },
  coverTitle: { fontSize: 20, color: "#FFFFFF", textAlign: "center", maxWidth: 380, fontFamily: "Times-Bold", marginTop: 6 },
  coverConsultantPhoto: { width: 90, height: 90, borderRadius: 45, marginTop: 14, borderWidth: 3, borderColor: "#FFFFFF" },
  coverConsultantName: { fontSize: 15, color: "#FFFFFF", fontFamily: "Times-Bold", marginTop: 8 },
  coverConsultantDetail: { fontSize: 10, color: "#FFFFFF", opacity: 0.9 },
  coverQr: { width: 90, height: 90, backgroundColor: "#FFFFFF", padding: 5, borderRadius: 6, marginTop: 10 },

  divider: { height: "100%", alignItems: "center", justifyContent: "center", gap: 8, padding: 40 },
  dividerTitle: { fontSize: 34, color: "#FFFFFF", fontFamily: "Times-Bold", textAlign: "center" },
  dividerCount: { fontSize: 12, color: "#FFFFFF", opacity: 0.9 },

  fullBleedImage: { width: "100%", height: "100%", objectFit: "contain" },

  productsPage: { padding: 24, paddingBottom: 44, flexDirection: "column", gap: 16, alignContent: "flex-start" },
  card: { flex: 1, flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  cardImage: { width: "38%", objectFit: "cover", backgroundColor: COLORS.bg },
  cardBody: { flex: 1, padding: 14, gap: 4 },
  cardBadgeRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  cardBadge: { fontSize: 7, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },
  cardVolume: { fontSize: 7, color: COLORS.muted },
  cardName: { fontSize: 13, fontFamily: "Times-Bold", color: COLORS.text },
  cardCode: { fontSize: 7, color: COLORS.muted },
  cardText: { fontSize: 8, color: COLORS.muted },
  cardLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.text },
  cardPrice: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COLORS.text },
  cardComparePrice: { fontSize: 9, color: COLORS.muted, textDecoration: "line-through" },
  cardFooterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 6, gap: 8 },
  cardCta: { fontSize: 8, color: "#FFFFFF", backgroundColor: "#2F5233", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  cardQr: { width: 34, height: 34, backgroundColor: "#FFFFFF" },
  emptyState: { padding: 40, textAlign: "center", color: COLORS.muted },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center",
    gap: 10, padding: 8, fontSize: 7, color: COLORS.muted,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  footerLabel: { fontFamily: "Helvetica-Bold", color: COLORS.text },
  footerPhoto: { width: 24, height: 24, borderRadius: 12 },
  footerQr: { width: 24, height: 24 },

  lastPage: { height: "100%", alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  lastPagePhoto: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "#FFFFFF" },
  lastPageName: { fontSize: 16, color: "#FFFFFF", fontFamily: "Times-Bold" },
  lastPageDetail: { fontSize: 10, color: "#FFFFFF", opacity: 0.92 },
  lastPageTitle: { fontSize: 22, color: "#FFFFFF", textAlign: "center", fontFamily: "Times-Bold", marginTop: 8 },
  lastPageText: { fontSize: 11, color: "#FFFFFF", textAlign: "center", maxWidth: 320, opacity: 0.92 },
  qrImage: { width: 150, height: 150, backgroundColor: "#FFFFFF", padding: 7, borderRadius: 8, marginTop: 6 },
  ctaBadge: { backgroundColor: COLORS.accent, color: COLORS.accentForeground, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 20, fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 6 },
});

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function readPublicImage(relativePath: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "public", relativePath));
}

function Footer({ consultant, qrDataUrl }: { consultant: ConsultantInfo; qrDataUrl: string | null }) {
  const lines: { label: string; value: string }[] = [
    { label: "Consultor", value: consultant.name },
    consultant.whatsapp ? { label: "WhatsApp", value: consultant.whatsapp } : null,
    consultant.showCity && consultant.city ? { label: "Cidade", value: consultant.city } : null,
    consultant.showInstagram && consultant.instagram ? { label: "Instagram", value: consultant.instagram } : null,
  ].filter((line): line is { label: string; value: string } => line !== null);

  return (
    <View style={styles.footer} fixed>
      {consultant.photoUrl && consultant.showPhoto && <PdfImage src={consultant.photoUrl} style={styles.footerPhoto} />}
      {lines.map((line) => (
        <Text key={line.label}>
          <Text style={styles.footerLabel}>{line.label}: </Text>
          {line.value}
        </Text>
      ))}
      {qrDataUrl && <PdfImage src={qrDataUrl} style={styles.footerQr} />}
    </View>
  );
}

function ProductCardContent({
  product,
  consultant,
  qrDataUrl,
}: {
  product: ProductSnapshotItem;
  consultant: ConsultantInfo;
  qrDataUrl: string | null;
}) {
  if (product.perfume) {
    const perfume = product.perfume;
    const theme = getCategoryPdfTheme(perfume.olfactoryCategory ?? "Perfumes");
    const whatsappLink = buildWhatsappLink(consultant.whatsapp, `Olá! Tenho interesse no perfume "${product.name}".`);
    return (
      <View style={styles.card}>
        {product.imageUrl && <PdfImage src={product.imageUrl} style={styles.cardImage} />}
        <View style={styles.cardBody}>
          {perfume.olfactoryCategory && (
            <Text style={[styles.cardBadge, { backgroundColor: theme.badge.bg, color: theme.badge.fg }]}>
              {perfume.olfactoryCategory}
            </Text>
          )}
          <Text style={styles.cardName}>{product.name}</Text>
          {perfume.inspiredBy && (
            <Text style={styles.cardText}><Text style={styles.cardLabel}>Inspirado em: </Text>{perfume.inspiredBy}</Text>
          )}
          {perfume.topNotes && <Text style={styles.cardText}><Text style={styles.cardLabel}>Saída: </Text>{perfume.topNotes}</Text>}
          {perfume.heartNotes && <Text style={styles.cardText}><Text style={styles.cardLabel}>Corpo: </Text>{perfume.heartNotes}</Text>}
          {perfume.baseNotes && <Text style={styles.cardText}><Text style={styles.cardLabel}>Fundo: </Text>{perfume.baseNotes}</Text>}
          {perfume.occasion && <Text style={styles.cardText}><Text style={styles.cardLabel}>Ocasião ideal: </Text>{perfume.occasion}</Text>}
          <Text style={styles.cardText}>{perfume.careText}</Text>
          <View style={styles.cardFooterRow}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {Object.entries(perfume.volumePrices).map(([label, cents]) => (
                <Text key={label} style={styles.cardPrice}>{label}: {formatCents(cents)}</Text>
              ))}
            </View>
            {whatsappLink && <Link src={whatsappLink} style={styles.cardCta}>Fale com seu consultor</Link>}
            {qrDataUrl && <PdfImage src={qrDataUrl} style={styles.cardQr} />}
          </View>
        </View>
      </View>
    );
  }

  const theme = getCategoryPdfTheme(product.categoryName);
  const whatsappLink = buildWhatsappLink(
    consultant.whatsapp,
    `Olá! Tenho interesse no produto "${product.name}" (Código ${product.sku}).`
  );

  return (
    <View style={styles.card}>
      {product.imageUrl && <PdfImage src={product.imageUrl} style={styles.cardImage} />}
      <View style={styles.cardBody}>
        <View style={styles.cardBadgeRow}>
          {product.categoryName && (
            <Text style={[styles.cardBadge, { backgroundColor: theme.badge.bg, color: theme.badge.fg }]}>
              {product.categoryName}
            </Text>
          )}
          {product.volume && <Text style={styles.cardVolume}>{product.volume}</Text>}
        </View>
        <Text style={styles.cardName}>{product.name}</Text>
        <Text style={styles.cardCode}>Código {product.sku}</Text>
        {product.description && <Text style={styles.cardText}><Text style={styles.cardLabel}>Para que serve: </Text>{product.description}</Text>}
        {product.benefits && <Text style={styles.cardText}><Text style={styles.cardLabel}>Benefícios: </Text>{product.benefits}</Text>}
        {product.howToUse && <Text style={styles.cardText}><Text style={styles.cardLabel}>Modo de uso: </Text>{product.howToUse}</Text>}
        {product.ingredients && <Text style={styles.cardText}><Text style={styles.cardLabel}>Ingredientes: </Text>{product.ingredients}</Text>}
        <View style={styles.cardFooterRow}>
          <View>
            <Text style={styles.cardPrice}>{product.priceCents !== null ? formatCents(product.priceCents) : "Consulte"}</Text>
            {product.compareAtPriceCents !== null && (
              <Text style={styles.cardComparePrice}>{formatCents(product.compareAtPriceCents)}</Text>
            )}
          </View>
          {whatsappLink && <Link src={whatsappLink} style={styles.cardCta}>Fale com seu consultor</Link>}
          {qrDataUrl && <PdfImage src={qrDataUrl} style={styles.cardQr} />}
        </View>
      </View>
    </View>
  );
}

// Duas por página — cards grandes e generosos (não grade de 9), pedido
// explícito: "cada página precisa vender o produto, não só exibir".
function ProductPages({
  products,
  consultant,
  qrByProductId,
}: {
  products: ProductSnapshotItem[];
  consultant: ConsultantInfo;
  qrByProductId: Map<string, string>;
}) {
  const pages: ProductSnapshotItem[][] = [];
  for (let i = 0; i < products.length; i += 2) pages.push(products.slice(i, i + 2));

  return (
    <>
      {pages.map((pageProducts, index) => (
        <Page key={index} size="A4" style={[styles.page, styles.productsPage]}>
          {pageProducts.map((product) => (
            <ProductCardContent
              key={product.productId}
              product={product}
              consultant={consultant}
              qrDataUrl={qrByProductId.get(product.productId) ?? null}
            />
          ))}
          <Footer consultant={consultant} qrDataUrl={qrByProductId.get("__footer__") ?? null} />
        </Page>
      ))}
    </>
  );
}

function MagazineDocument({
  title,
  sections,
  consultant,
  qrDataUrl,
  whatsappLink,
  qrByProductId,
  masculinoImage,
  femininoImage,
}: {
  title: string;
  sections: MagazineSection[];
  consultant: ConsultantInfo;
  qrDataUrl: string | null;
  whatsappLink: string | null;
  qrByProductId: Map<string, string>;
  masculinoImage: Buffer;
  femininoImage: Buffer;
}) {
  const now = new Date();
  const monthLabel = `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;
  const firstPerfumeSectionKey = sections.find((s) => s.key.startsWith("perfumes"))?.key;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.cover, { backgroundColor: getCoverPdfColor(consultant.coverColor) }]}>
          <Text style={styles.coverKicker}>ATLÂNTICA NATURAL</Text>
          <Text style={styles.coverWordmark}>AtlHub</Text>
          <Text style={styles.coverSubtitle}>REVISTA DIGITAL</Text>
          <Text style={styles.coverBadge}>{monthLabel}</Text>
          <Text style={styles.coverTitle}>{title}</Text>

          {consultant.photoUrl && consultant.showPhoto && (
            <PdfImage src={consultant.photoUrl} style={styles.coverConsultantPhoto} />
          )}
          <Text style={styles.coverConsultantName}>{consultant.name}</Text>
          {consultant.jobTitle && <Text style={styles.coverConsultantDetail}>{consultant.jobTitle}</Text>}
          {consultant.showCity && consultant.city && <Text style={styles.coverConsultantDetail}>{consultant.city}</Text>}
          {consultant.whatsapp && <Text style={styles.coverConsultantDetail}>{consultant.whatsapp}</Text>}
          {consultant.showInstagram && consultant.instagram && (
            <Text style={styles.coverConsultantDetail}>{consultant.instagram}</Text>
          )}
          {qrDataUrl && consultant.showQrCode && <PdfImage src={qrDataUrl} style={styles.coverQr} />}
        </View>
      </Page>

      {sections.length === 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.emptyState}>Nenhum produto encontrado no catálogo sincronizado.</Text>
          <Footer consultant={consultant} qrDataUrl={qrByProductId.get("__footer__") ?? null} />
        </Page>
      )}

      {sections.map((section) => {
        const showIntro = section.key === firstPerfumeSectionKey;
        const theme = getCategoryPdfTheme(section.title);

        return (
          <React.Fragment key={section.key}>
            {showIntro && (
              <>
                <Page size="A4" style={styles.page}>
                  <PdfImage src={masculinoImage} style={styles.fullBleedImage} />
                </Page>
                <Page size="A4" style={styles.page}>
                  <PdfImage src={femininoImage} style={styles.fullBleedImage} />
                </Page>
              </>
            )}
            <Page size="A4" style={styles.page}>
              <View style={[styles.divider, { backgroundColor: theme.divider.bg }]}>
                <Text style={styles.dividerTitle}>{section.title}</Text>
                <Text style={styles.dividerCount}>
                  {section.products.length} {section.products.length === 1 ? "produto" : "produtos"}
                </Text>
              </View>
            </Page>
            <ProductPages products={section.products} consultant={consultant} qrByProductId={qrByProductId} />
          </React.Fragment>
        );
      })}

      <Page size="A4" style={styles.page}>
        <View style={[styles.lastPage, { backgroundColor: getCoverPdfColor(consultant.coverColor) }]}>
          {consultant.photoUrl && consultant.showPhoto && <PdfImage src={consultant.photoUrl} style={styles.lastPagePhoto} />}
          <Text style={styles.lastPageName}>{consultant.name}</Text>
          {consultant.jobTitle && <Text style={styles.lastPageDetail}>{consultant.jobTitle}</Text>}

          <Text style={styles.lastPageTitle}>Obrigado por conhecer nossa revista.</Text>
          <Text style={styles.lastPageText}>Será um prazer atender você.</Text>

          {qrDataUrl && consultant.showQrCode && <PdfImage src={qrDataUrl} style={styles.qrImage} />}
          {whatsappLink && <Link src={whatsappLink} style={styles.ctaBadge}>Fale com seu consultor</Link>}

          <View style={{ alignItems: "center", gap: 2, marginTop: 8 }}>
            {consultant.showCity && consultant.city && <Text style={styles.lastPageDetail}>{consultant.city}</Text>}
            {consultant.whatsapp && <Text style={styles.lastPageDetail}>WhatsApp: {consultant.whatsapp}</Text>}
            {consultant.showInstagram && consultant.instagram && <Text style={styles.lastPageDetail}>{consultant.instagram}</Text>}
          </View>
        </View>
      </Page>
    </Document>
  );
}

async function buildProductQrMap(
  sections: MagazineSection[],
  consultant: ConsultantInfo
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const section of sections) {
    for (const product of section.products) {
      const message = product.perfume
        ? `Olá! Tenho interesse no perfume "${product.name}".`
        : `Olá! Tenho interesse no produto "${product.name}" (Código ${product.sku}).`;
      const link = buildWhatsappLink(consultant.whatsapp, message);
      if (!link) continue;
      const dataUrl = await QRCode.toDataURL(link, { width: 120, margin: 1 });
      map.set(product.productId, dataUrl);
    }
  }
  return map;
}

export async function renderMagazinePdf({
  title,
  sections,
  consultant,
}: {
  title: string;
  sections: MagazineSection[];
  consultant: ConsultantInfo;
}): Promise<Buffer> {
  const whatsappLink = buildWhatsappLink(consultant.whatsapp, consultant.magazineMessage || DEFAULT_MAGAZINE_MESSAGE);
  const qrDataUrl =
    whatsappLink && consultant.showQrCode ? await QRCode.toDataURL(whatsappLink, { width: 320, margin: 1 }) : null;

  const qrByProductId = await buildProductQrMap(sections, consultant);
  if (whatsappLink && consultant.showQrCode) {
    qrByProductId.set("__footer__", await QRCode.toDataURL(whatsappLink, { width: 120, margin: 1 }));
  }

  const masculinoImage = readPublicImage("magazine/tabela-olfativa-masculina.jpg");
  const femininoImage = readPublicImage("magazine/tabela-olfativa-feminina.jpg");

  return renderToBuffer(
    <MagazineDocument
      title={title}
      sections={sections}
      consultant={consultant}
      qrDataUrl={qrDataUrl}
      whatsappLink={whatsappLink}
      qrByProductId={qrByProductId}
      masculinoImage={masculinoImage}
      femininoImage={femininoImage}
    />
  );
}
