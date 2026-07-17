// Uma edição = um PDF real da revista oficial impressa da Atlântica
// Natural + o mapeamento manual único feito uma vez pra ela (posição de
// cada preço, achada por OCR — ver scripts/ocr-page-prices.ts — e o SKU
// real de cada produto retratado, conferido à mão). Quando a Atlântica
// publicar uma edição nova, o processo é: colocar o PDF novo em
// `public/magazine/editions/{id}.pdf`, criar um arquivo `{id}.ts` aqui
// seguindo este mesmo formato, e registrar em `registry.ts` — nenhum
// código do assembler precisa mudar (ver official-pdf-assembler.ts).

export type OfficialProductMapping = {
  sku: string;
  // Fração da largura/altura da página (0 a 1, origem no canto superior
  // esquerdo — convenção de imagem/canvas) — independe de escala de
  // renderização.
  priceBox: { xFrac: number; yFrac: number; widthFrac: number; heightFrac: number };
};

export type OfficialEditionDefinition = {
  id: string; // ex.: "2026-03" — usado no nome do arquivo do PDF e como chave
  label: string; // ex.: "Edição Março 2026" — só pra log/painel, nunca mostrado ao consultor
  pdfPath: string; // relativo a public/, ex.: "magazine/editions/2026-03.pdf"
  publishedAt: string; // "2026-03-01" — usado só pra decidir qual é a mais recente
  coverPage: number;
  indexPage: number;
  backCoverPage: number;
  // Página de conteúdo depois da qual as duas tabelas olfativas oficiais
  // (masculina/feminina, compartilhadas entre edições — ver registry.ts)
  // são inseridas. `null` se esta edição não tiver uma seção de perfumes
  // dedicada (aí as tabelas não entram automaticamente).
  fragrancePage: number | null;
  contentPageRange: { start: number; end: number };
  // Página → produtos mapeados nela. Página sem entrada aqui é copiada
  // intacta (sem preço atualizado, sem página de detalhe) — nunca quebra a
  // geração, só não personaliza aquela página específica.
  mapping: Record<number, OfficialProductMapping[]>;
};
