// Sem "server-only" de propósito — mesmo motivo de category-colors.ts:
// usado tanto por MagazineView (Server Component) quanto por
// official-pdf-assembler.ts (que pode rodar fora do bundler do Next).

export const COVER_COLOR_VALUES = ["VERDE", "AZUL", "ROXO", "DOURADO"] as const;
export type CoverColor = (typeof COVER_COLOR_VALUES)[number];

export const COVER_COLOR_LABELS: Record<CoverColor, string> = {
  VERDE: "Verde",
  AZUL: "Azul",
  ROXO: "Roxo",
  DOURADO: "Dourado",
};

// Gradiente CSS pro fundo da capa (web) — a cor escolhida troca só a
// identidade visual da CAPA (pedido explícito do cliente); o resto do tema
// da revista (.magazine-theme em app/globals.css) não muda.
const WEB_COVER_GRADIENTS: Record<CoverColor, string> = {
  VERDE: "linear-gradient(135deg, oklch(0.32 0.07 155), oklch(0.20 0.05 155))",
  AZUL: "linear-gradient(135deg, oklch(0.34 0.10 250), oklch(0.20 0.07 250))",
  ROXO: "linear-gradient(135deg, oklch(0.34 0.11 305), oklch(0.20 0.08 305))",
  DOURADO: "linear-gradient(135deg, oklch(0.55 0.13 80), oklch(0.32 0.09 60))",
};

// Cor sólida equivalente pro PDF — @react-pdf/renderer não entende oklch()
// nem gradiente de View sem montar um <Svg> à parte; uma cor sólida por
// opção já cumpre "muda a identidade visual da capa" sem complexidade extra.
const PDF_COVER_COLORS: Record<CoverColor, string> = {
  VERDE: "#233F27",
  AZUL: "#173355",
  ROXO: "#3A2350",
  DOURADO: "#7A4E12",
};

export function getCoverWebGradient(color: CoverColor): string {
  return WEB_COVER_GRADIENTS[color] ?? WEB_COVER_GRADIENTS.VERDE;
}

export function getCoverPdfColor(color: CoverColor): string {
  return PDF_COVER_COLORS[color] ?? PDF_COVER_COLORS.VERDE;
}
