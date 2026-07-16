import "server-only";
import { prisma } from "@/src/lib/prisma";

export type GuideExcerpt = {
  beneficios: string | null;
  modoDeUso: string | null;
};

const MODO_DE_USO_MARKERS = [/MODO DE USAR/i, /MODO DE USO/i, /COMO USAR/i, /MODO DE UTILIZAR/i];

// Algumas páginas do Guia são índice/sumário (uma lista enumerada com
// dezenas de produtos diferentes, ex.: "26 - NATUOZ SABONETE 27 - MÁSCARA
// FACIAL ..."), não a descrição de um produto específico. Um nome de
// produto curto (ex.: "FERRO", "ZMA") aparece como substring nessas listas
// por acaso, e por serem trechos únicos por documento, isso fazia dezenas
// de produtos sem relação nenhuma compartilharem o mesmo excerto. Detecta
// esse padrão (muitas ocorrências de "número - PALAVRA") e trata como "não
// encontrado" em vez de mostrar a lista inteira como se fosse a descrição.
const INDEX_LIST_MARKER = /\b\d{1,3}\s*[-–—]\s*[A-ZÀ-ÖØ-Þ]/g;
const INDEX_LIST_THRESHOLD = 5;

function looksLikeIndexList(text: string): boolean {
  const matches = text.match(INDEX_LIST_MARKER);
  return (matches?.length ?? 0) >= INDEX_LIST_THRESHOLD;
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

// Busca DETERMINÍSTICA (sem IA/embedding, decisão confirmada com o
// usuário 2026-07-16) — procura o nome do produto literalmente no texto do
// Guia (OCR, ver src/modules/guide/ingest.ts). Nunca inventa: só devolve
// algo quando o produto é mencionado de verdade num trecho real. Se o
// trecho tiver um marcador de "modo de usar", separa benefícios/modo de uso
// pelo próprio texto; sem marcador, devolve tudo em `beneficios` (o
// componente que consome mostra como "Sobre o produto — Guia Oficial" nesse
// caso, sem forçar uma separação que o texto-fonte não tem).
export async function findGuideExcerptForProduct(productName: string): Promise<GuideExcerpt> {
  // Nome de uma palavra só (ex.: "FERRO", "ZINCO", "BCAA") tem alta chance de
  // aparecer como palavra comum dentro da descrição de OUTRO produto (ex.:
  // "auxilia na absorção de ferro" na página do Pré-Treino) — testado, isso
  // atribuía descrição errada pra dezenas de produtos. Sem forma barata de
  // confirmar que o trecho é realmente sobre ESSE produto, oculta em vez de
  // arriscar mostrar informação de outro item (mesmo princípio de "nunca
  // inventar": incerto demais também não conta como "existe de verdade").
  if (!productName.trim().includes(" ")) return { beneficios: null, modoDeUso: null };

  const documentIds = await getLatestReadyDocumentIds();
  if (documentIds.length === 0) return { beneficios: null, modoDeUso: null };

  const candidates = await prisma.guideChunk.findMany({
    where: {
      guideDocumentId: { in: documentIds },
      content: { contains: productName, mode: "insensitive" },
    },
    take: 5,
  });
  const chunk = candidates.find((c) => !looksLikeIndexList(c.content));
  if (!chunk) return { beneficios: null, modoDeUso: null };

  const text = chunk.content.trim();
  for (const marker of MODO_DE_USO_MARKERS) {
    const match = text.match(marker);
    if (match && match.index !== undefined) {
      const beneficios = text.slice(0, match.index).trim();
      const modoDeUso = text.slice(match.index).trim();
      return {
        beneficios: beneficios.length > 0 ? beneficios : null,
        modoDeUso: modoDeUso.length > 0 ? modoDeUso : null,
      };
    }
  }

  return { beneficios: text, modoDeUso: null };
}
