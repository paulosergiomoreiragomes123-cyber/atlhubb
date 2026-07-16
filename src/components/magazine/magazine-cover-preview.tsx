const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export function monthLabelFor(date: Date): string {
  return `${MONTHS_PT[date.getMonth()]} ${date.getFullYear()}`;
}

// Prévia compacta da capa (sem produtos) — usada no card de listagem em
// /consultor/revista, substituindo o antigo placeholder "Sem capa" por algo
// que já parece um catálogo de verdade, mesmo sem imagem própria de capa.
export function MagazineCoverPreview({ title, date }: { title: string; date: Date }) {
  return (
    <div
      className="magazine-theme flex h-full flex-col items-center justify-center gap-2 p-4 text-center"
      style={{ background: "linear-gradient(135deg, var(--magazine-primary), oklch(0.24 0.05 155))" }}
    >
      <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--magazine-primary-foreground)] opacity-80">
        Atlântica Natural
      </span>
      <span className="font-[var(--magazine-font-display)] text-xl font-semibold text-[var(--magazine-primary-foreground)]">
        AtlHub
      </span>
      <span className="rounded-full bg-[var(--magazine-accent)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--magazine-accent-foreground)]">
        {monthLabelFor(date)}
      </span>
      <span className="line-clamp-2 px-1 text-xs text-[var(--magazine-primary-foreground)]">{title}</span>
    </div>
  );
}
