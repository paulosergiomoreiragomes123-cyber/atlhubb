"use server";

import { redirect } from "next/navigation";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { createConversation } from "@/src/modules/ai/conversations";

export async function createConversationAction() {
  const user = await requireApprovedUser();
  const conversation = await createConversation(user.id);
  redirect(`/consultor/assistente-ia/${conversation.id}`);
}
