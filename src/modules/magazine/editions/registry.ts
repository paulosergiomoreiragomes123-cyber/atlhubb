import { EDITION_2026_03 } from "./2026-03";
import type { OfficialEditionDefinition } from "./types";

// Todas as edições já mapeadas, mais antiga primeiro. Quando a Atlântica
// publicar uma edição nova: criar `{id}.ts` (ver types.ts pro formato),
// colocar o PDF em `public/magazine/editions/{id}.pdf` e adicionar aqui —
// nenhum outro arquivo precisa mudar.
export const OFFICIAL_EDITIONS: OfficialEditionDefinition[] = [EDITION_2026_03];

// A revista sempre usa a edição mais recente por `publishedAt` — sem
// campo "ativa" separado pra manter (evita esquecer de alternar na hora
// de publicar uma edição nova).
export function getActiveEdition(): OfficialEditionDefinition {
  return [...OFFICIAL_EDITIONS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
}
