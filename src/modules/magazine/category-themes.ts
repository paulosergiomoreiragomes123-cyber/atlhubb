// Sem "server-only" de propósito — usado tanto por MagazineView (Server
// Component) quanto por pdf-template.tsx, que pode rodar fora do bundler
// do Next. Sucessor de category-colors.ts (Fase 7): a Magazine V3 usa cor
// cheia nas divisórias de categoria (uma página só, por seção — pedido
// explícito), não só um badge pastel — por isso a paleta agora tem duas
// variantes por cor (divisória bold + badge suave), não uma só.

function categoryColorIndex(categoryName: string, paletteSize: number): number {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = (hash * 31 + categoryName.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % paletteSize;
}

export type CategoryWebTheme = { divider: string; badge: string };
export type CategoryPdfTheme = {
  divider: { bg: string; fg: string };
  badge: { bg: string; fg: string };
};

// 10 famílias de cor bem distintas — cada categoria real cai sempre na
// mesma, sem cadastro manual por seção nova.
const WEB_THEMES: CategoryWebTheme[] = [
  { divider: "bg-rose-600 text-white", badge: "bg-rose-100 text-rose-800" },
  { divider: "bg-amber-600 text-white", badge: "bg-amber-100 text-amber-800" },
  { divider: "bg-teal-600 text-white", badge: "bg-teal-100 text-teal-800" },
  { divider: "bg-violet-600 text-white", badge: "bg-violet-100 text-violet-800" },
  { divider: "bg-emerald-600 text-white", badge: "bg-emerald-100 text-emerald-800" },
  { divider: "bg-sky-600 text-white", badge: "bg-sky-100 text-sky-800" },
  { divider: "bg-orange-600 text-white", badge: "bg-orange-100 text-orange-800" },
  { divider: "bg-fuchsia-600 text-white", badge: "bg-fuchsia-100 text-fuchsia-800" },
  { divider: "bg-indigo-600 text-white", badge: "bg-indigo-100 text-indigo-800" },
  { divider: "bg-lime-600 text-white", badge: "bg-lime-100 text-lime-800" },
];

// Mesma paleta em hex, mesmo índice — @react-pdf/renderer não entende
// classes Tailwind.
const PDF_THEMES: CategoryPdfTheme[] = [
  { divider: { bg: "#E11D48", fg: "#FFFFFF" }, badge: { bg: "#FFE4E9", fg: "#9F1239" } },
  { divider: { bg: "#D97706", fg: "#FFFFFF" }, badge: { bg: "#FEF3C7", fg: "#92400E" } },
  { divider: { bg: "#0D9488", fg: "#FFFFFF" }, badge: { bg: "#CCFBF1", fg: "#115E59" } },
  { divider: { bg: "#7C3AED", fg: "#FFFFFF" }, badge: { bg: "#EDE9FE", fg: "#5B21B6" } },
  { divider: { bg: "#059669", fg: "#FFFFFF" }, badge: { bg: "#D1FAE5", fg: "#065F46" } },
  { divider: { bg: "#0284C7", fg: "#FFFFFF" }, badge: { bg: "#E0F2FE", fg: "#075985" } },
  { divider: { bg: "#EA580C", fg: "#FFFFFF" }, badge: { bg: "#FFEDD5", fg: "#9A3412" } },
  { divider: { bg: "#C026D3", fg: "#FFFFFF" }, badge: { bg: "#FAE8FF", fg: "#86198F" } },
  { divider: { bg: "#4F46E5", fg: "#FFFFFF" }, badge: { bg: "#E0E7FF", fg: "#3730A3" } },
  { divider: { bg: "#65A30D", fg: "#FFFFFF" }, badge: { bg: "#ECFCCB", fg: "#3F6212" } },
];

const FALLBACK_WEB: CategoryWebTheme = { divider: "bg-muted text-foreground", badge: "bg-muted text-muted-foreground" };
const FALLBACK_PDF: CategoryPdfTheme = { divider: { bg: "#64748B", fg: "#FFFFFF" }, badge: { bg: "#F1F5F9", fg: "#475569" } };

export function getCategoryWebTheme(categoryName: string | null): CategoryWebTheme {
  if (!categoryName) return FALLBACK_WEB;
  return WEB_THEMES[categoryColorIndex(categoryName, WEB_THEMES.length)];
}

export function getCategoryPdfTheme(categoryName: string | null): CategoryPdfTheme {
  if (!categoryName) return FALLBACK_PDF;
  return PDF_THEMES[categoryColorIndex(categoryName, PDF_THEMES.length)];
}
