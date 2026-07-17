import "server-only";
import { prisma } from "@/src/lib/prisma";

export type GuideMatch = {
  description: string | null;
  benefits: string | null;
  howToUse: string | null;
  ingredients: string | null;
};

const EMPTY_MATCH: GuideMatch = { description: null, benefits: null, howToUse: null, ingredients: null };

// Marcadores reais que aparecem no texto do Guia (OCR) — cada um começa um
// segmento novo. Ordenados aqui só por legibilidade; a posição de cada um
// no texto (não a ordem desta lista) decide a ordem final dos segmentos.
const SEGMENT_MARKERS: { key: keyof GuideMatch; pattern: RegExp }[] = [
  { key: "description", pattern: /SOBRE O PRODUTO/i },
  { key: "benefits", pattern: /BENEF[IÍ]CIOS/i },
  { key: "howToUse", pattern: /MODO DE USAR|MODO DE USO|COMO USAR|MODO DE UTILIZAR|SUGEST[ÃA]O DE CONSUMO|SUGEST[ÃA]O DE USO/i },
  { key: "ingredients", pattern: /INFORMA[ÇC][ÃA]O NUTRICIONAL|COMPOSI[ÇC][ÃA]O/i },
];

// Algumas páginas do Guia são índice/sumário (uma lista enumerada com
// dezenas de produtos diferentes, ex.: "26 - NATUOZ SABONETE 27 - MÁSCARA
// FACIAL ..."), não a descrição de um produto específico. Um nome de
// produto curto aparece como substring nessas listas por acaso — detecta
// esse padrão (muitas ocorrências de "número - PALAVRA") e trata como "não
// encontrado" em vez de mostrar a lista inteira como se fosse a descrição.
const INDEX_LIST_MARKER = /\b\d{1,3}\s*[-–—]\s*[A-ZÀ-ÖØ-Þ]/g;
const INDEX_LIST_THRESHOLD = 5;

function looksLikeIndexList(text: string): boolean {
  const matches = text.match(INDEX_LIST_MARKER);
  return (matches?.length ?? 0) >= INDEX_LIST_THRESHOLD;
}

// Tabelas de informação nutricional são a pior parte do OCR do Guia (muitas
// colunas numéricas apertadas) — testado ao vivo: viravam texto ilegível
// tipo "1AG 31SC made à G7 ÁEAL...Ao/[IN HR 2 UM". Colchetes/pipe (`[`, `]`,
// `|`) quase nunca aparecem em português de verdade, mas aparecem sempre
// nesse tipo de ruído de OCR — um sinal barato e confiável de "isso não dá
// pra mostrar". Mostrar ruído ilegível como se fosse informação real de
// produto (ainda mais em suplemento/vitamina) é pior do que simplesmente
// ocultar, então trata como "não encontrado" — mesmo princípio de nunca
// inventar aplicado a "identificável demais como lixo pra mostrar".
const OCR_NOISE_MARKER = /[[\]|]/g;
const OCR_NOISE_THRESHOLD = 2;

function looksLikeOcrNoise(text: string): boolean {
  const matches = text.match(OCR_NOISE_MARKER);
  return (matches?.length ?? 0) >= OCR_NOISE_THRESHOLD;
}

// Mesmo filtro de versão de src/modules/guide/search.ts (searchGuideChunks):
// só documentos PRONTOS, só a versão mais recente por título.
async function getLatestReadyDocumentIds(): Promise<string[]> {
  const readyDocuments = await prisma.guideDocument.findMany({
    where: { status: "PRONTO" },
    orderBy: { version: "desc" },
    select: { id: true, title: true },
  });
  const latestByTitle = new Map<string, string>();
  for (const doc of readyDocuments) {
    if (!latestByTitle.has(doc.title)) latestByTitle.set(doc.title, doc.id);
  }
  return [...latestByTitle.values()];
}

const SIZE_SUFFIX = /\b\d+(?:[.,]\d+)?\s?(?:ml|g|kg|l|caps?|cápsulas?)\b/gi;

// Variantes de busca por especificidade — a mais específica primeiro. Nome
// completo raramente falha (é o que está na loja); a versão sem volume/
// tamanho ajuda quando o Guia descreve o produto sem essa informação no
// título. Nunca tenta uma palavra isolada curta (ver guard abaixo).
function buildNameSearchVariants(productName: string): string[] {
  const variants = new Set<string>();
  const trimmed = productName.trim();
  if (trimmed) variants.add(trimmed);

  const withoutSize = trimmed.replace(SIZE_SUFFIX, "").replace(/\s+/g, " ").trim();
  if (withoutSize && withoutSize !== trimmed) variants.add(withoutSize);

  return [...variants].filter((v) => v.includes(" ")); // nunca uma palavra só (ver findGuideMatchForProduct)
}

function splitIntoSegments(text: string): GuideMatch {
  const found: { key: keyof GuideMatch; index: number }[] = [];
  for (const { key, pattern } of SEGMENT_MARKERS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) found.push({ key, index: match.index });
  }

  if (found.length === 0) {
    // Sem nenhum marcador reconhecido — todo o trecho vira "descrição"
    // (o componente mostra como "Sobre o produto — Guia Oficial"), nunca
    // forçando uma separação que o texto-fonte não tem.
    return looksLikeOcrNoise(text) ? EMPTY_MATCH : { ...EMPTY_MATCH, description: text };
  }

  found.sort((a, b) => a.index - b.index);

  const result: GuideMatch = { ...EMPTY_MATCH };
  // Texto antes do primeiro marcador reconhecido (ex.: cabeçalho de OCR
  // ruidoso) não vira descrição sozinho a menos que o primeiro marcador
  // já seja "description" — evita um pedaço de lixo virar "descrição".
  for (let i = 0; i < found.length; i++) {
    const start = found[i].index;
    const end = i + 1 < found.length ? found[i + 1].index : text.length;
    const segment = text.slice(start, end).trim();
    if (segment.length > 0 && !looksLikeOcrNoise(segment)) result[found[i].key] = segment;
  }
  return result;
}

// Busca DETERMINÍSTICA (sem IA/embedding) — procura o produto literalmente
// no texto do Guia (OCR, ver src/modules/guide/ingest.ts). Nunca inventa:
// só devolve algo quando o produto é mencionado de verdade num trecho real,
// separado em até 4 campos por marcador real do próprio texto. Sucessor de
// guide-excerpt.ts (Fase 7.2) — mesmas proteções, mais variantes de busca.
export async function findGuideMatchForProduct(productName: string): Promise<GuideMatch> {
  const variants = buildNameSearchVariants(productName);
  if (variants.length === 0) return EMPTY_MATCH; // nome de uma palavra só — nunca busca (ver perfume-matching.ts pro caso de perfumes)

  const documentIds = await getLatestReadyDocumentIds();
  if (documentIds.length === 0) return EMPTY_MATCH;

  for (const variant of variants) {
    const candidates = await prisma.guideChunk.findMany({
      where: {
        guideDocumentId: { in: documentIds },
        content: { contains: variant, mode: "insensitive" },
      },
      take: 5,
    });

    for (const candidate of candidates) {
      if (looksLikeIndexList(candidate.content)) continue;

      const segments = splitIntoSegments(candidate.content.trim());
      // O nome buscado precisa aparecer na própria introdução do produto
      // ("SOBRE O PRODUTO ..."), não só em algum lugar do trecho inteiro —
      // testado ao vivo: sem essa checagem, "COMPLEXO B" batia por acaso
      // dentro da lista de ingredientes de OUTRO suplemento (Pré-Treino, que
      // menciona "vitaminas do complexo B" de passagem), atribuindo a
      // descrição errada. Toda página real do Guia nomeia o produto logo no
      // início da descrição — exigir isso reduz bastante esse tipo de
      // falso-positivo (testado: uma versão mais estrita, exigindo posição
      // bem no começo da descrição, cortou também matches legítimos como
      // "Picolinato de Cromo" — a posição varia demais entre páginas pra
      // usar como corte rígido; ficar só na presença dentro da descrição já
      // é uma melhoria real sobre buscar no trecho inteiro).
      if (segments.description?.toLowerCase().includes(variant.toLowerCase())) {
        return segments;
      }
    }
  }

  return EMPTY_MATCH;
}
