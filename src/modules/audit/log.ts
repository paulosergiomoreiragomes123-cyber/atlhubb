import "server-only";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";

type Actor = { id: string; name: string; email: string };

// Todo Server Action de mutação no admin chama isso depois de escrever no
// banco. `action` é uma string livre tipo "product.create" — sem enum de
// propósito, a lista de ações tende a crescer mais rápido do que vale a pena
// centralizar, e o valor já é auto-descritivo o bastante pra revisar depois.
export async function recordAuditLog(params: {
  actor: Actor;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorEmail: params.actor.email,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
