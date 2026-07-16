import Link from "next/link";

// Layout deliberadamente sem checagem de sessão — tudo em /c/* é público de
// propósito (é o que alguém vê ao escanear um QR Code ou abrir um link
// compartilhado por um consultor, sem ter conta no AtlHub).
export default function CompartilhamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-3">
        <span className="text-lg font-semibold">AtlHub</span>
        <span className="ml-2 text-sm text-muted-foreground">
          Atlântica Natural
        </span>
      </header>

      <main className="flex-1 bg-muted/20 p-6">{children}</main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        É consultor(a) da Atlântica Natural?{" "}
        <Link href="/cadastro" className="underline underline-offset-4">
          Cadastre-se no AtlHub
        </Link>
      </footer>
    </div>
  );
}
