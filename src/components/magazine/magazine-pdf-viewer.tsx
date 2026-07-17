"use client";

import { useState } from "react";

// Magazine V4: a revista exibida ao vivo (leitor do consultor, preview do
// admin, página pública de QR Code) é o MESMO PDF gerado por
// assembleOfficialMagazinePdf (ver official-pdf-assembler.ts) que o botão
// "Baixar PDF" baixa — não existe mais um catálogo React em paralelo
// (Magazine V3/MagazineView foi removida, ver PROJECT.md). `src` aponta pra
// uma rota que gera o PDF NA HORA a cada carregamento (nunca armazenado),
// por isso o aviso de carregamento — pode levar alguns segundos. Client
// Component só pra dar feedback visível de quando o iframe termina de
// carregar (senão uma geração lenta ou uma falha fica indistinguível de
// "travado" pro consultor).
export function MagazinePdfViewer({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {!loaded && (
        <p className="text-xs text-muted-foreground">
          Gerando sua revista personalizada — pode levar alguns segundos na primeira vez.
        </p>
      )}
      <div className="overflow-hidden rounded-xl border">
        <iframe
          src={src}
          title="Revista digital Atlântica Natural"
          className="h-[85vh] w-full"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
