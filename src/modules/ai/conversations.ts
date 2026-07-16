import "server-only";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";
import type { AtlhubUIMessage } from "@/src/modules/ai/agent";

// Toda função aqui recebe `userId` e filtra por ele no WHERE — nunca busca só
// por conversationId. É assim que garantimos que um consultor nunca lê a
// conversa de outro, mesmo se descobrir o ID de alguém (IDOR).

export async function createConversation(userId: string) {
  return prisma.conversation.create({
    data: { userId, messages: [] },
  });
}

export async function loadConversation(id: string, userId: string) {
  return prisma.conversation.findFirst({
    where: { id, userId },
  });
}

export async function listConversationsForUser(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function saveConversationMessages(
  id: string,
  userId: string,
  messages: AtlhubUIMessage[]
) {
  const firstUserMessage = messages.find((m) => m.role === "user");
  const title = firstUserMessage
    ? extractText(firstUserMessage).slice(0, 80)
    : undefined;

  await prisma.conversation.updateMany({
    where: { id, userId },
    data: {
      messages: messages as unknown as Prisma.InputJsonValue,
      ...(title ? { title } : {}),
    },
  });
}

function extractText(message: AtlhubUIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}
