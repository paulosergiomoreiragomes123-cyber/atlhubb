// Sem "server-only" de propósito: usado tanto por formulários client-side
// (profile-form.tsx, o seletor de cor) quanto por official-pdf-assembler.ts
// (que pode rodar fora do bundler do Next).

export const COVER_COLOR_VALUES = ["VERDE", "AZUL", "ROXO", "DOURADO"] as const;
export type CoverColor = (typeof COVER_COLOR_VALUES)[number];

export const COVER_COLOR_LABELS: Record<CoverColor, string> = {
  VERDE: "Verde",
  AZUL: "Azul",
  ROXO: "Roxo",
  DOURADO: "Dourado",
};

// Cor sólida da capa personalizada (página de abertura do PDF, Magazine
// V4) — a cor escolhida em /consultor/perfil troca só essa página nova;
// a capa oficial impressa (cópia direta) nunca muda de cor.
const PDF_COVER_COLORS: Record<CoverColor, string> = {
  VERDE: "#233F27",
  AZUL: "#173355",
  ROXO: "#3A2350",
  DOURADO: "#7A4E12",
};

export function getCoverPdfColor(color: CoverColor): string {
  return PDF_COVER_COLORS[color] ?? PDF_COVER_COLORS.VERDE;
}
