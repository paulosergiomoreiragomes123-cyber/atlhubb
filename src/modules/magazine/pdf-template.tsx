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
import { getCategoryPdfColors } from "@/src/modules/magazine/category-colors";
import { getCoverPdfColor } from "@/src/modules/magazine/cover-colors";
import type { ProductSnapshotItem } from "@/src/modules/magazine/generator";
import type { ConsultantInfo } from "@/src/components/magazine/magazine-view";

const DEFAULT_MAGAZINE_MESSAGE = "Olá! Vi sua revista e gostaria de saber mais.";

// Mesma paleta de app/globals.css (.magazine-theme), convertida pra hex —
// @react-pdf/renderer não entende oklch(), só hex/rgb/named colors.
const COLORS = {
  primary: "#2F5233",
  primaryDark: "#233F27",
  accent: "#D9A441",
  accentForeground: "#3D2E10",
  text: "#2A3A2C",
  muted: "#6B7A6C",
  border: "#E3DFD3",
  bg: "#FBF8F1",
  surface: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.bg, fontSize: 10, color: COLORS.text, paddingBottom: 36 },
  cover: {
    height: "100%",
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 40,
  },
  coverKicker: { fontSize: 11, color: COLORS.bg, letterSpacing: 3, opacity: 0.8 },
  coverWordmark: { fontSize: 38, color: COLORS.bg, fontWeight: 700 },
  coverSubtitle: { fontSize: 13, color: COLORS.bg, letterSpacing: 2 },
  coverBadge: {
    backgroundColor: COLORS.accent,
    color: COLORS.accentForeground,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontSize: 12,
  },
  coverTitle: { fontSize: 20, color: COLORS.bg, textAlign: "center", maxWidth: 360 },
  productsPage: { padding: 24, paddingBottom: 40, flexDirection: "row", flexWrap: "wrap", gap: 16, alignContent: "flex-start" },
  card: {
    width: "31%",
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 130, objectFit: "cover", backgroundColor: COLORS.bg },
  cardBody: { padding: 8, gap: 3 },
  cardBadgeRow: { flexDirection: "row", gap: 4 },
  cardCategory: { fontSize: 6.5, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 6 },
  cardVolume: { fontSize: 6.5, color: COLORS.muted },
  cardName: { fontSize: 9, fontWeight: 700, color: COLORS.text },
  cardCode: { fontSize: 6.5, color: COLORS.muted },
  cardDescription: { fontSize: 7, color: COLORS.muted },
  cardGuideLabel: { fontSize: 6.5, fontWeight: 700, color: COLORS.text },
  cardGuideText: { fontSize: 6.5, color: COLORS.muted },
  cardPrice: { fontSize: 11, fontWeight: 700, color: COLORS.primary, marginTop: 3 },
  cardCta: { fontSize: 7, color: COLORS.primary, marginTop: 2 },
  emptyState: { padding: 40, textAlign: "center", color: COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    padding: 10,
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  footerLabel: { fontWeight: 700, color: COLORS.text },
  lastPage: {
    height: "100%",
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 40,
  },
  lastPageTitle: { fontSize: 22, color: COLORS.bg, textAlign: "center" },
  lastPageText: { fontSize: 11, color: COLORS.bg, textAlign: "center", maxWidth: 320, opacity: 0.9 },
  qrImage: { width: 130, height: 130, backgroundColor: "#FFFFFF", padding: 6, borderRadius: 8 },
  ctaBadge: {
    backgroundColor: COLORS.accent,
    color: COLORS.accentForeground,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  consultantPhoto: { width: 70, height: 70, borderRadius: 35, marginTop: 8 },
  consultantName: { fontSize: 12, color: COLORS.bg, fontWeight: 700 },
  consultantDetail: { fontSize: 10, color: COLORS.bg, opacity: 0.9 },
});

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Footer({ consultant }: { consultant: ConsultantInfo }) {
  const lines: { label: string; value: string }[] = [
    { label: "Consultor", value: consultant.name },
    consultant.phone ? { label: "Telefone", value: consultant.phone } : null,
    consultant.whatsapp ? { label: "WhatsApp", value: consultant.whatsapp } : null,
    // Cidade/Instagram respeitam as opções de exibição do perfil.
    consultant.showCity && consultant.city ? { label: "Cidade", value: consultant.city } : null,
    consultant.showInstagram && consultant.instagram
      ? { label: "Instagram", value: consultant.instagram }
      : null,
  ].filter((line): line is { label: string; value: string } => line !== null);

  return (
    <View style={styles.footer} fixed>
      {lines.map((line) => (
        <Text key={line.label}>
          <Text style={styles.footerLabel}>{line.label}: </Text>
          {line.value}
        </Text>
      ))}
    </View>
  );
}

// Uma página de capa + páginas de produtos (9 por página, grade 3x3 — react-
// pdf não tem CSS grid, mas flexWrap com largura fixa por card produz o
// mesmo resultado visual) + uma última página de contato. Imagens são
// buscadas direto da URL remota (S3) pelo próprio @react-pdf/renderer, sem
// passo extra de download. O rodapé (`fixed`) se repete de verdade em TODA
// página gerada — é a vantagem real de usar essa lib em vez de HTML
// convertido (pedido explícito: "não usar HTML convertido").
function MagazineDocument({
  title,
  products,
  consultant,
  qrDataUrl,
  whatsappLink,
}: {
  title: string;
  products: ProductSnapshotItem[];
  consultant: ConsultantInfo;
  qrDataUrl: string | null;
  whatsappLink: string | null;
}) {
  const now = new Date();
  const monthLabel = `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;
  const pageSize = 9;
  const pages: ProductSnapshotItem[][] = [];
  for (let i = 0; i < products.length; i += pageSize) {
    pages.push(products.slice(i, i + pageSize));
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.cover, { backgroundColor: getCoverPdfColor(consultant.coverColor) }]}>
          <Text style={styles.coverKicker}>ATLÂNTICA NATURAL</Text>
          <Text style={styles.coverWordmark}>AtlHub</Text>
          <Text style={styles.coverSubtitle}>REVISTA DIGITAL</Text>
          <Text style={styles.coverBadge}>{monthLabel}</Text>
          <Text style={styles.coverTitle}>{title}</Text>
        </View>
      </Page>

      {pages.length === 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.emptyState}>Nenhum produto encontrado para esse filtro no momento.</Text>
          <Footer consultant={consultant} />
        </Page>
      )}

      {pages.map((pageProducts, pageIndex) => (
        <Page key={pageIndex} size="A4" style={[styles.page, styles.productsPage]}>
          {pageProducts.map((product) => {
            const categoryColors = getCategoryPdfColors(product.categoryName);
            const productWhatsappLink = buildWhatsappLink(
              consultant.whatsapp,
              `Olá! Tenho interesse no produto "${product.name}" (Código ${product.sku}).`
            );
            return (
              <View key={product.productId} style={styles.card}>
                {product.imageUrl && <PdfImage src={product.imageUrl} style={styles.cardImage} />}
                <View style={styles.cardBody}>
                  <View style={styles.cardBadgeRow}>
                    {product.categoryName && (
                      <Text
                        style={[
                          styles.cardCategory,
                          { backgroundColor: categoryColors.bg, color: categoryColors.fg },
                        ]}
                      >
                        {product.categoryName}
                      </Text>
                    )}
                    {product.volume && <Text style={styles.cardVolume}>{product.volume}</Text>}
                  </View>
                  <Text style={styles.cardName}>{product.name}</Text>
                  <Text style={styles.cardCode}>Código {product.sku}</Text>
                  {product.description && <Text style={styles.cardDescription}>{product.description}</Text>}
                  {product.beneficios && (
                    <View>
                      <Text style={styles.cardGuideLabel}>Sobre o produto (Guia Oficial):</Text>
                      <Text style={styles.cardGuideText}>{product.beneficios}</Text>
                    </View>
                  )}
                  {product.modoDeUso && (
                    <View>
                      <Text style={styles.cardGuideLabel}>Modo de uso:</Text>
                      <Text style={styles.cardGuideText}>{product.modoDeUso}</Text>
                    </View>
                  )}
                  <Text style={styles.cardPrice}>
                    {product.priceCents !== null ? formatCents(product.priceCents) : "Consulte"}
                  </Text>
                  {productWhatsappLink && (
                    <Link src={productWhatsappLink} style={styles.cardCta}>
                      💬 Peça pelo WhatsApp
                    </Link>
                  )}
                </View>
              </View>
            );
          })}
          <Footer consultant={consultant} />
        </Page>
      ))}

      <Page size="A4" style={styles.page}>
        <View style={styles.lastPage}>
          <Text style={styles.lastPageTitle}>Gostou de algum produto?</Text>
          <Text style={styles.lastPageText}>Entre em contato comigo pelo WhatsApp.</Text>
          {qrDataUrl && consultant.showQrCode && <PdfImage src={qrDataUrl} style={styles.qrImage} />}
          {whatsappLink && <Link src={whatsappLink} style={styles.ctaBadge}>💬 Falar no WhatsApp</Link>}
          {consultant.photoUrl && consultant.showPhoto && (
            <PdfImage src={consultant.photoUrl} style={styles.consultantPhoto} />
          )}
          <Text style={styles.consultantName}>{consultant.name}</Text>
          {consultant.jobTitle && <Text style={styles.consultantDetail}>{consultant.jobTitle}</Text>}
          {consultant.phone && <Text style={styles.consultantDetail}>{consultant.phone}</Text>}
          {consultant.whatsapp && (
            <Text style={styles.consultantDetail}>WhatsApp: {consultant.whatsapp}</Text>
          )}
          {consultant.showCity && consultant.city && (
            <Text style={styles.consultantDetail}>{consultant.city}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderMagazinePdf({
  title,
  products,
  consultant,
}: {
  title: string;
  products: ProductSnapshotItem[];
  consultant: ConsultantInfo;
}): Promise<Buffer> {
  const whatsappLink = buildWhatsappLink(consultant.whatsapp, consultant.magazineMessage || DEFAULT_MAGAZINE_MESSAGE);
  const qrDataUrl =
    whatsappLink && consultant.showQrCode
      ? await QRCode.toDataURL(whatsappLink, { width: 240, margin: 1 })
      : null;

  return renderToBuffer(
    <MagazineDocument
      title={title}
      products={products}
      consultant={consultant}
      qrDataUrl={qrDataUrl}
      whatsappLink={whatsappLink}
    />
  );
}
