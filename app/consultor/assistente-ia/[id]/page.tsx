import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { loadConversation } from "@/src/modules/ai/conversations";
import type { AtlhubUIMessage } from "@/src/modules/ai/agent";
import { ChatWindow } from "@/src/components/consultor/chat-window";

export const metadata: Metadata = { title: "Assistente IA — AtlHub" };

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApprovedUser();
  const { id } = await params;

  const conversation = await loadConversation(id, user.id);
  if (!conversation) notFound();

  const initialMessages = (conversation.messages ?? []) as unknown as AtlhubUIMessage[];

  return <ChatWindow id={id} initialMessages={initialMessages} />;
}
