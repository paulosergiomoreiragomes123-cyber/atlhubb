"use client";

import { useEffect, useState } from "react";

// Magazine V4: a revista exibida ao vivo (leitor do consultor, preview do
// admin, página pública de QR Code) é o MESMO PDF gerado por
// assembleOfficialMagazinePdf (ver official-pdf-assembler.ts) que o botão
// "Baixar PDF" baixa — não existe mais um catálogo React em paralelo
// (Magazine V3/MagazineView foi removida, ver PROJECT.md). `src` aponta pra
// uma rota que gera o PDF NA HORA a cada carregamento (nunca armazenado) —
// leva dezenas de segundos (medido em produção: ~70s), então o overlay de
// carregamento precisa deixar isso óbvio (spinner + contador + aviso
// explícito pra não fechar a página), senão parece travado e o consultor
// desiste antes do PDF terminar (foi exatamente o que aconteceu — ver
// PROJECT.md).
export function MagazinePdfViewer({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (loaded) return;
    const interval = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(interval);
  }, [loaded]);

  return (
    <div className="relative overflow-hidden rounded-xl border">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 px-6 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Montando sua revista personalizada com os preços atuais — pode levar até 1 minuto e meio na primeira
            vez. Não feche esta página.
          </p>
          <p className="text-xs text-muted-foreground/70">{elapsed}s</p>
        </div>
      )}
      <iframe
        src={src}
        title="Revista digital Atlântica Natural"
        className="h-[85vh] w-full"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
