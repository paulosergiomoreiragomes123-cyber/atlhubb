import { requireAdmin } from "@/src/modules/auth/dal";
import { AppHeader } from "@/src/components/layout/app-header";
import { AdminSidebar } from "@/src/components/layout/admin-sidebar";

const NAV_ITEMS = [
  { label: "Painel", href: "/admin/painel" },
  { label: "Usuários", href: "/admin/usuarios" },
  { label: "Produtos", href: "/admin/produtos" },
  { label: "Categorias", href: "/admin/categorias" },
  { label: "Marcas", href: "/admin/marcas" },
  { label: "Fornecedores", href: "/admin/fornecedores" },
  { label: "Revista", href: "/admin/revista" },
  { label: "Loja / Sincronização", href: "/admin/loja" },
  { label: "Auditoria", href: "/admin/auditoria" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar navItems={NAV_ITEMS} />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader user={user} navItems={NAV_ITEMS} hideNavOnDesktop />
        <main className="flex-1 bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
