import { Document, Page, View, Text, Image as PdfImage, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import { formatCents } from "@/src/lib/currency";
import type { ProductSnapshotItem } from "@/src/modules/magazine/generator";

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
  page: { backgroundColor: COLORS.bg, fontSize: 10, color: COLORS.text, padding: 0 },
  cover: {
    height: "100%",
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  coverKicker: { fontSize: 11, color: COLORS.bg, letterSpacing: 3, opacity: 0.8 },
  coverWordmark: { fontSize: 40, color: COLORS.bg, fontWeight: 700 },
  coverBadge: {
    backgroundColor: COLORS.accent,
    color: COLORS.accentForeground,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontSize: 12,
  },
  coverTitle: { fontSize: 22, color: COLORS.bg, textAlign: "center", maxWidth: 360 },
  coverFilter: { fontSize: 10, color: COLORS.bg, opacity: 0.8 },
  productsPage: { padding: 24, flexDirection: "row", flexWrap: "wrap", gap: 16, alignContent: "flex-start" },
  card: {
    width: "31%",
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 130, objectFit: "cover", backgroundColor: COLORS.bg },
  cardBody: { padding: 8, gap: 4 },
  cardCategory: { fontSize: 7, color: COLORS.muted, textTransform: "uppercase" },
  cardName: { fontSize: 9, fontWeight: 700, color: COLORS.text },
  cardDescription: { fontSize: 7.5, color: COLORS.muted },
  cardPrice: { fontSize: 11, fontWeight: 700, color: COLORS.primary, marginTop: 4 },
  cardLink: { fontSize: 7, color: COLORS.primary, textDecoration: "underline" },
  emptyState: { padding: 40, textAlign: "center", color: COLORS.muted },
});

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Uma página de capa + páginas de produtos (9 por página, grade 3x3) — react-pdf
// não tem CSS grid, mas flexWrap com largura fixa por card produz o mesmo
// resultado visual. Imagens são buscadas direto da URL remota (S3) pelo
// próprio @react-pdf/renderer, sem passo extra de download.
function MagazineDocument({ title, products }: { title: string; products: ProductSnapshotItem[] }) {
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
        <View style={styles.cover}>
          <Text style={styles.coverKicker}>ATLÂNTICA NATURAL</Text>
          <Text style={styles.coverWordmark}>AtlHub</Text>
          <Text style={styles.coverBadge}>{monthLabel}</Text>
          <Text style={styles.coverTitle}>{title}</Text>
        </View>
      </Page>

      {pages.length === 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.emptyState}>Nenhum produto encontrado para esse filtro no momento.</Text>
        </Page>
      )}

      {pages.map((pageProducts, pageIndex) => (
        <Page key={pageIndex} size="A4" style={[styles.page, styles.productsPage]}>
          {pageProducts.map((product) => (
            <View key={product.productId} style={styles.card}>
              {product.imageUrl && <PdfImage src={product.imageUrl} style={styles.cardImage} />}
              <View style={styles.cardBody}>
                {product.categoryName && <Text style={styles.cardCategory}>{product.categoryName}</Text>}
                <Text style={styles.cardName}>{product.name}</Text>
                {product.description && <Text style={styles.cardDescription}>{product.description}</Text>}
                <Text style={styles.cardPrice}>
                  {product.priceCents !== null ? formatCents(product.priceCents) : "Consulte"}
                </Text>
                {product.storeUrl && <Text style={styles.cardLink}>{product.storeUrl}</Text>}
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}

export async function renderMagazinePdf({
  title,
  products,
}: {
  title: string;
  products: ProductSnapshotItem[];
}): Promise<Buffer> {
  return renderToBuffer(<MagazineDocument title={title} products={products} />);
}
