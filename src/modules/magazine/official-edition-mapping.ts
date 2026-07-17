// Mapeamento manual único da edição oficial impressa
// (`magazine-oficial-referencia.pdf`, "ED 17 Março 26") — feito uma vez,
// olhando cada página renderizada + OCR pra achar a região de cada preço
// (ver scripts/ocr-page-prices.ts, usado como ferramenta de apoio, não
// roda em produção). Cada entrada aqui é conferida à mão contra o produto
// real sincronizado (por nome — os códigos impressos na revista não são o
// storeProductId, testado e confirmado). Produtos retratados na edição que
// não existem mais no catálogo sincronizado (a edição impressa é fixa, de
// março/2026; o catálogo sincronizado evolui) ficam de fora — nunca é
// inventado um SKU só pra preencher a página.
//
// `priceBox` é fração da largura/altura da página (0 a 1, origem no canto
// superior esquerdo, mesma convenção do OCR/imagem) — independe de escala,
// convertido pra pontos do PDF no momento de montar (ver
// official-pdf-assembler.ts).

export type OfficialProductMapping = {
  sku: string;
  priceBox: { xFrac: number; yFrac: number; widthFrac: number; heightFrac: number };
};

export const OFFICIAL_EDITION_MAPPING: Record<number, OfficialProductMapping[]> = {
  // Página 3 — Linha Ozonizada (seção "Ozonizados" do índice, TOC 01).
  // Só 4 dos 12 produtos retratados existem no catálogo sincronizado hoje
  // — a linha de óleos "NatuOz" (Hot/Bronze/Bucal/Corpo/Rosto/Pés e
  // Pernas/Fios/Power/Intímo) e "NatuOz"/"NatuOz Family" (óleo de
  // girassol) foram descontinuadas desde a edição impressa.
  3: [
    { sku: "LOJA-342", priceBox: { xFrac: 0.1092, yFrac: 0.12, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Hidratante Radiante
    { sku: "LOJA-343", priceBox: { xFrac: 0.4748, yFrac: 0.0576, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Hidratante Sensual
    { sku: "LOJA-344", priceBox: { xFrac: 0.7975, yFrac: 0.1217, widthFrac: 0.1193, heightFrac: 0.0279 } }, // Hidratante Encantada
    { sku: "LOJA-345", priceBox: { xFrac: 0.0538, yFrac: 0.3367, widthFrac: 0.0756, heightFrac: 0.0131 } }, // Rosa Mosqueta
  ],
};

// Páginas absolutas do PDF original tratadas como especiais (não entram no
// loop de "página de conteúdo + overlay + página de detalhe").
export const OFFICIAL_COVER_PAGE = 1;
export const OFFICIAL_INDEX_PAGE = 2;
export const OFFICIAL_BACK_COVER_PAGE = 55;
export const OFFICIAL_FRAGRANCE_PAGE = 47; // tabelas olfativas entram logo depois desta
export const OFFICIAL_TOTAL_PAGES = 55;
export const OFFICIAL_CONTENT_PAGE_RANGE = { start: 3, end: 54 };
