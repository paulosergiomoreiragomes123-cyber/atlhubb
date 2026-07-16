import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/src/modules/auth/actions";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

export function AppHeader({
  user,
  navItems,
  hideNavOnDesktop = false,
}: {
  user: { name: string; role: "CONSULTOR" | "ADMIN" };
  navItems: NavItem[];
  // Usado no admin: a navegação já vive na sidebar em telas md+, então essa
  // topbar só precisa repetir os links em telas pequenas (onde a sidebar some).
  hideNavOnDesktop?: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-3">
      <div className={cn("flex items-center gap-6", hideNavOnDesktop && "md:hidden")}>
        <span className="text-lg font-semibold">AtlHub</span>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className={cn("flex items-center gap-3", hideNavOnDesktop && "md:ml-auto")}>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="leading-none font-medium">{user.name}</p>
            <Badge variant="secondary" className="mt-1">
              {user.role === "ADMIN" ? "Administrador" : "Consultor"}
            </Badge>
          </div>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
