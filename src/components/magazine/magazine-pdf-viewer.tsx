// Magazine V4: a revista exibida ao vivo (leitor do consultor, preview do
// admin, página pública de QR Code) é o MESMO PDF gerado por
// assembleOfficialMagazinePdf (ver official-pdf-assembler.ts) que o botão
// "Baixar PDF" baixa — não existe mais um catálogo React em paralelo
// (Magazine V3/MagazineView foi removida, ver PROJECT.md). `src` aponta pra
// uma rota que gera o PDF NA HORA a cada carregamento (nunca armazenado),
// por isso o aviso de carregamento — pode levar alguns segundos.
export function MagazinePdfViewer({ src }: { src: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Gerando sua revista personalizada — pode levar alguns segundos na primeira vez.
      </p>
      <div className="overflow-hidden rounded-xl border">
        <iframe src={src} title="Revista digital Atlântica Natural" className="h-[85vh] w-full" />
      </div>
    </div>
  );
}
