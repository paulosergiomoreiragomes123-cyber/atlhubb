import { requireApprovedUser } from "@/src/modules/auth/dal";
import { AppHeader } from "@/src/components/layout/app-header";

const NAV_ITEMS = [
  { label: "Painel", href: "/consultor/painel" },
  { label: "Catálogo", href: "/consultor/catalogo" },
  { label: "Revista", href: "/consultor/revista" },
  { label: "Assistente IA", href: "/consultor/assistente-ia" },
];

export default async function ConsultorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireApprovedUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} navItems={NAV_ITEMS} />
      <main className="flex-1 bg-muted/20 p-6">{children}</main>
    </div>
  );
}
