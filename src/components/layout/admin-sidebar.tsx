"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

export function AdminSidebar({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-background p-4 md:flex">
      <span className="mb-4 px-2 text-lg font-semibold">AtlHub</span>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin/painel"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
