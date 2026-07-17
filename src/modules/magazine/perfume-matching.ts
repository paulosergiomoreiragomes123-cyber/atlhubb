// Sem "server-only" de propósito — mesmo motivo de category-themes.ts:
// usado tanto pelo MagazineView (Server Component) quanto pelo
// official-pdf-assembler.ts, que pode rodar fora do bundler do Next.

// Produtos de perfume sincronizados vêm como "Fragrância Rouge 100ml" ou
// "Fragráncia Match 15ml" (as duas grafias existem de verdade nos dados
// sincronizados). Normaliza pra comparar com o nome exato da tabela oficial
// (ex.: "Rouge", "521 Vip Rose Elixir") — casamento é SEMPRE exato depois de
// normalizar os dois lados; nunca fuzzy/Levenshtein, pra nunca atribuir o
// perfil de uma fragrância a outra por engano.
const FRAGRANCE_PREFIX = /^fragr[aâá]ncia\s+/i;
const VOLUME_SUFFIX = /\b\d+(?:[.,]\d+)?\s?(?:ml|g|kg|l)\b/gi;
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function normalizePerfumeName(raw: string): string {
  return raw
    .replace(FRAGRANCE_PREFIX, "")
    .replace(VOLUME_SUFFIX, "")
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    // Aspas retas, curva (’) e acento agudo usado como apóstrofo (´) — a
    // loja sincronizada usa variantes diferentes do apóstrofo de "521
    // Sexy's" dependendo de onde o dado veio; todas viram a mesma coisa
    // aqui (ainda é normalização determinística, não fuzzy matching).
    .replace(/['’´".]/g, "")
    .replace(/[-_]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Extrai o "nome base" (sem volume) exatamente como aparece no produto —
// usado só pra agrupar variações de tamanho do mesmo perfume (15ml/100ml),
// não pra casar com o PerfumeProfile (isso usa a versão normalizada acima).
export function stripVolumeFromName(raw: string): string {
  return raw.replace(VOLUME_SUFFIX, "").replace(/\s+/g, " ").trim();
}

// Detecta qual variante de volume um produto de perfume representa — hoje
// só 15ml/100ml existem de verdade no catálogo sincronizado (ver
// generator.ts), mas guarda o rótulo literal encontrado (não força só essas
// duas opções) pra não quebrar se a loja sincronizar um tamanho novo.
export function extractPerfumeVolumeLabel(raw: string): string | null {
  const match = raw.match(VOLUME_SUFFIX);
  return match ? match[0].replace(/\s+/g, "").toLowerCase() : null;
}

// Texto único de modo de uso da linha inteira de perfumes Bortoletto —
// transcrito literalmente da tabela oficial masculina (rodapé "Benefícios
// dos perfumes"/"Modo de usar"), vale igual pra qualquer fragrância da
// linha porque a própria fonte já apresenta isso como instrução única, não
// uma descrição por perfume. Nunca gerado — é o mesmo texto real sempre.
export const PERFUME_LINE_CARE_TEXT =
  "Aplique a fragrância nas regiões de maior circulação sanguínea, como pescoço, pulsos e atrás das orelhas, mantendo uma distância de aproximadamente 15 a 20 cm. Para melhor desempenho e fixação, utilize sobre a pele limpa e seca. Evite esfregar após a aplicação, permitindo que a fragrância se desenvolva naturalmente ao longo do dia. Reaplique, se desejar, para intensificar a perfumação.";
