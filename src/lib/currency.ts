export function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// Aceita "19,90", "1.234,56" ou "19.90" (usuário pode digitar com vírgula ou
// ponto decimal) e devolve centavos. `null` se não conseguir interpretar.
export function parseCentsFromInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/[^\d.,]/g, "");
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  const asFloat = Number.parseFloat(normalized);
  if (Number.isNaN(asFloat)) return null;

  return Math.round(asFloat * 100);
}
