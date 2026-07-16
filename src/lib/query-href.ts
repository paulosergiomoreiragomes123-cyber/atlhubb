// Reconstrói a URL atual trocando/removendo alguns parâmetros de busca — usado
// pelos filtros de lista (produtos, catálogo, auditoria). `undefined` remove o
// parâmetro; qualquer outro valor sobrescreve.
export function buildQueryHref<T extends Record<string, string | undefined>>(
  basePath: string,
  currentParams: T,
  overrides: Partial<T>
) {
  const next = { ...currentParams, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return `${basePath}${query ? `?${query}` : ""}`;
}
