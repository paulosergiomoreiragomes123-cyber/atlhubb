// Sem "server-only" de propósito: usado tanto por MagazineView (Server
// Component) quanto por pdf-template.tsx — ambos rodam no servidor, mas o
// segundo pode ser importado por um script/route handler fora do bundler
// do Next, mesmo motivo de outros módulos de magazine/guide.

// Um hash simples e determinístico — mesma categoria sempre cai no mesmo
// índice, sem precisar cadastrar cor por categoria manualmente (inclusive
// pra categorias novas que a loja adicionar no futuro).
function categoryColorIndex(categoryName: string, paletteSize: number): number {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = (hash * 31 + categoryName.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % paletteSize;
}

// Classes Tailwind (bg/texto) — usadas pelo MagazineView (web). Paleta
// bem colorida de propósito (pedido explícito: "muito colorido", estilo
// catálogo Natura/Avon), uma cor por categoria.
const WEB_PALETTE = [
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-orange-100 text-orange-800",
  "bg-fuchsia-100 text-fuchsia-800",
] as const;

// Mesma paleta em hex — @react-pdf/renderer não entende classes Tailwind,
// só cores explícitas. Índices alinhados com WEB_PALETTE (mesma categoria =
// mesma cor nos dois formatos).
const PDF_PALETTE = [
  { bg: "#FFE4E9", fg: "#9F1239" },
  { bg: "#FEF3C7", fg: "#92400E" },
  { bg: "#CCFBF1", fg: "#115E59" },
  { bg: "#EDE9FE", fg: "#5B21B6" },
  { bg: "#D1FAE5", fg: "#065F46" },
  { bg: "#E0F2FE", fg: "#075985" },
  { bg: "#FFEDD5", fg: "#9A3412" },
  { bg: "#FAE8FF", fg: "#86198F" },
] as const;

export function getCategoryWebClasses(categoryName: string | null): string {
  if (!categoryName) return "bg-muted text-muted-foreground";
  return WEB_PALETTE[categoryColorIndex(categoryName, WEB_PALETTE.length)];
}

export function getCategoryPdfColors(categoryName: string | null): { bg: string; fg: string } {
  if (!categoryName) return { bg: "#F1F5F9", fg: "#475569" };
  return PDF_PALETTE[categoryColorIndex(categoryName, PDF_PALETTE.length)];
}
