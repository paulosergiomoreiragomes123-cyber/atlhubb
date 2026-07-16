import type { Metadata } from "next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/src/modules/auth/dal";
import { listUsers } from "@/src/modules/users/queries";
import { UserRowActions } from "@/src/components/admin/user-row-actions";
import type { UserStatus } from "@/src/generated/prisma/enums";

export const metadata: Metadata = { title: "Usuários — AtlHub" };

const STATUS_BADGE: Record<UserStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  AGUARDANDO: { label: "Aguardando", variant: "secondary" },
  APROVADO: { label: "Aprovado", variant: "default" },
  REPROVADO: { label: "Reprovado", variant: "destructive" },
  SUSPENSO: { label: "Suspenso", variant: "destructive" },
};

export default async function UsuariosPage() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <p className="text-muted-foreground">
          Aprove, reprove ou suspenda o acesso dos consultores.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const badge = STATUS_BADGE[user.status];
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {[user.city, user.state].filter(Boolean).join("/") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
                <TableCell>
                  {user.role === "ADMIN" ? "Administrador" : "Consultor"}
                </TableCell>
                <TableCell>
                  <UserRowActions user={user} isSelf={user.id === admin.id} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
